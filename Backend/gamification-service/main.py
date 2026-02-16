import logging
import os
import threading
from typing import Annotated, List

import auth_client
import crud
import models
import schemas
from database import engine, get_db
from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from rabbitmq_consumer import start_consumer
from rabbitmq_publisher import publish_event
from sqlalchemy.orm import Session

# Internal API key for service-to-service communication (DSGVO endpoints)
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "kashif-internal-secret-2026")

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Gamification Service")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Start RabbitMQ consumer
consumer_thread = threading.Thread(target=start_consumer, daemon=True)
consumer_thread.start()


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "gamification"}


async def get_current_user_id(authorization: Annotated[str, Header()]):
    """Verify token with auth service"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header"
        )
    token = authorization.replace("Bearer ", "")
    user = await auth_client.verify_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    return user["id"]


@app.get("/points/me", response_model=schemas.UserPoints)
async def get_my_points(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get current user's total points"""
    total_points = crud.get_user_total_points(db, user_id)
    return {"user_id": user_id, "total_points": total_points}


@app.get("/points/{user_id}", response_model=schemas.UserPoints)
async def get_user_points(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get any user's total points (public)"""
    total_points = crud.get_user_total_points(db, user_id)
    return {"user_id": user_id, "total_points": total_points}


@app.get("/transactions/me", response_model=List[schemas.PointTransaction])
async def get_my_transactions(
    skip: int = 0,
    limit: int = 100,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get current user's point transaction history"""
    transactions = crud.get_user_transactions(db, user_id, skip, limit)
    return transactions


@app.post("/points/award", response_model=schemas.PointTransaction)
async def award_points(
    award: schemas.PointAward,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Manually award points (admin only - should verify role)"""
    transaction = crud.create_transaction(
        db=db,
        user_id=award.user_id,
        points=award.points,
        transaction_type="admin_award",
        report_id=None,
        description=award.description
    )
    
    # Publish PointsAwarded event for notifications
    try:
        publish_event("points.awarded", {
            "user_id": transaction.user_id,
            "points": transaction.points,
            "transaction_type": transaction.type,
            "description": transaction.description
        })
    except Exception as e:
        logger.error(f"Failed to publish PointsAwarded event: {e}")
    
    # Also publish points.transaction.created to update auth-service total_points
    try:
        publish_event("points.transaction.created", {
            "user_id": transaction.user_id,
            "points": transaction.points,
            "transaction_type": transaction.type,
            "description": transaction.description
        })
        logger.info(f"Published points.transaction.created event for admin award to user {transaction.user_id}")
    except Exception as e:
        logger.error(f"Failed to publish points.transaction.created event: {e}")
    
    return transaction


@app.post("/points/redeem", response_model=schemas.PointTransaction)
async def redeem_points(
    redemption: schemas.PointRedemption,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Redeem points for coupons/rewards"""
    # Check if user has enough points
    total_points = crud.get_user_total_points(db, user_id)
    if total_points < redemption.points:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient points"
        )
    
    # Create negative transaction for redemption
    transaction = crud.create_transaction(
        db=db,
        user_id=user_id,
        points=-redemption.points,
        transaction_type="redemption",
        report_id=None,
        description=f"Redeemed for coupon {redemption.coupon_id}"
    )
    
    # Publish points.transaction.created to update auth-service total_points (negative points)
    try:
        publish_event("points.transaction.created", {
            "user_id": user_id,
            "points": -redemption.points,
            "transaction_type": "redemption",
            "description": f"Redeemed for coupon {redemption.coupon_id}"
        })
        logger.info(f"Published points.transaction.created event for redemption: user {user_id}, points -{redemption.points}")
    except Exception as e:
        logger.error(f"Failed to publish points.transaction.created event: {e}")
    
    # Publish PointsRedeemed event for notifications
    try:
        publish_event("points.redeemed", {
            "user_id": user_id,
            "points": redemption.points,
            "coupon_id": redemption.coupon_id
        })
    except Exception as e:
        logger.error(f"Failed to publish PointsRedeemed event: {e}")
    
    return transaction


@app.get("/leaderboard", response_model=List[schemas.LeaderboardEntry])
async def get_leaderboard(
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get points leaderboard"""
    leaderboard = crud.get_leaderboard(db, limit)
    return leaderboard


@app.post("/confirm-report/{report_id}")
async def confirm_report(
    report_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Award 20 points for confirming a report exists"""
    # Check if user already confirmed this report
    existing_confirmation = crud.get_confirmation_transaction(db, user_id, report_id)
    if existing_confirmation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already confirmed this report"
        )
    
    # Award 20 points for confirmation
    CONFIRMATION_POINTS = 20
    transaction = crud.create_transaction(
        db=db,
        user_id=user_id,
        points=CONFIRMATION_POINTS,
        transaction_type="REPORT_CONFIRMED",
        report_id=report_id,
        description=f"Confirmed report #{report_id}"
    )
    
    logger.info(f"Awarded {CONFIRMATION_POINTS} points to user {user_id} for confirming report {report_id}")
    
    # Publish event to update auth service
    try:
        publish_event("points.transaction.created", {
            "user_id": user_id,
            "points": CONFIRMATION_POINTS,
            "transaction_type": "REPORT_CONFIRMED",
            "report_id": report_id,
            "transaction_id": transaction.id
        })
        logger.info(f"Published points.transaction.created event for user {user_id}")
    except Exception as e:
        logger.error(f"Failed to publish points.transaction.created event: {e}")
    
    return {
        "points": CONFIRMATION_POINTS,
        "message": "Report confirmed successfully. You earned 20 points!",
        "transaction_id": transaction.id,
        "total_points": crud.get_user_total_points(db, user_id)
    }


# ============================================================
# DSGVO / GDPR — Internal Endpoints (service-to-service only)
# ============================================================

def verify_internal_key(x_internal_key: str = Header(None)):
    """Verify internal API key for service-to-service calls"""
    if x_internal_key != INTERNAL_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid internal API key")


@app.delete("/internal/user-data/{user_id}")
def delete_user_data(
    user_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(verify_internal_key)
):
    """DSGVO Art. 17 — Delete all point transactions for a user"""
    count = db.query(models.PointTransaction).filter(
        models.PointTransaction.user_id == user_id
    ).delete()
    db.commit()

    logger.info(f"DSGVO: Deleted {count} point transactions for user {user_id}")
    return {"user_id": user_id, "deleted": {"point_transactions": count}}


@app.get("/internal/user-data/{user_id}/export")
def export_user_data(
    user_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(verify_internal_key)
):
    """DSGVO Art. 15/20 — Export all point transactions for a user"""
    transactions = db.query(models.PointTransaction).filter(
        models.PointTransaction.user_id == user_id
    ).order_by(models.PointTransaction.created_at.desc()).all()

    transactions_data = []
    for t in transactions:
        transactions_data.append({
            "id": t.id,
            "type": t.type,
            "points": t.points,
            "report_id": t.report_id,
            "description": t.description,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })

    total_points = sum(t.points for t in transactions)

    return {
        "service": "gamification",
        "user_id": user_id,
        "total_points": total_points,
        "transactions": transactions_data,
    }