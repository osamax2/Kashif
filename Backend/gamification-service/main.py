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
from json_logger import setup_logging
from logging_middleware import RequestLoggingMiddleware
from rabbitmq_consumer import start_consumer
from rabbitmq_publisher import publish_event
from sqlalchemy import text
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

# Structured JSON logging with request-ID tracing
app.add_middleware(RequestLoggingMiddleware)

logger = setup_logging("gamification")

# Start RabbitMQ consumer
consumer_thread = threading.Thread(target=start_consumer, daemon=True)
consumer_thread.start()


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "gamification"}


@app.get("/health/detailed")
def health_check_detailed():
    """Detailed health check - verifies DB and RabbitMQ connectivity."""
    import time
    checks = {}
    overall = "healthy"

    # Check database
    start = time.time()
    try:
        db = next(get_db())
        db.execute(text("SELECT 1"))
        checks["database"] = {"status": "healthy", "response_ms": round((time.time() - start) * 1000, 2)}
    except Exception as e:
        checks["database"] = {"status": "unhealthy", "error": str(e)}
        overall = "unhealthy"

    # Check RabbitMQ
    start = time.time()
    try:
        import pika
        rabbitmq_url = os.getenv("RABBITMQ_URL", "amqp://kashif:kashif123@rabbitmq:5672/")
        connection = pika.BlockingConnection(pika.URLParameters(rabbitmq_url))
        connection.close()
        checks["rabbitmq"] = {"status": "healthy", "response_ms": round((time.time() - start) * 1000, 2)}
    except Exception as e:
        checks["rabbitmq"] = {"status": "unhealthy", "error": str(e)}
        overall = "degraded"

    status_code = 200 if overall == "healthy" else 503
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=status_code,
        content={"status": overall, "service": "gamification", "checks": checks}
    )


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
# Achievement Endpoints
# ============================================================

@app.get("/achievements", response_model=List[schemas.AchievementResponse])
async def get_all_achievements(
    db: Session = Depends(get_db)
):
    """Get all available achievements (public)"""
    return crud.get_all_achievements(db)


@app.get("/achievements/my", response_model=List[schemas.AchievementWithStatus])
async def get_my_achievements(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get all achievements with user's unlock status"""
    all_achievements = crud.get_all_achievements(db)
    unlocked_ids = crud.get_user_achievement_ids(db, user_id)
    
    # Get unlock timestamps
    user_achievements = crud.get_user_achievements(db, user_id)
    unlock_map = {ua.achievement_id: ua.unlocked_at for ua in user_achievements}
    
    result = []
    for a in all_achievements:
        data = schemas.AchievementWithStatus(
            id=a.id,
            key=a.key,
            name_en=a.name_en,
            name_ar=a.name_ar,
            description_en=a.description_en,
            description_ar=a.description_ar,
            icon=a.icon,
            category=a.category,
            condition_type=a.condition_type,
            condition_value=a.condition_value,
            points_reward=a.points_reward,
            is_active=a.is_active,
            created_at=a.created_at,
            unlocked=a.id in unlocked_ids,
            unlocked_at=unlock_map.get(a.id),
        )
        result.append(data)
    return result


@app.post("/achievements/check", response_model=schemas.AchievementCheckResult)
async def check_achievements(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Check and unlock any new achievements for the current user"""
    newly_unlocked = crud.check_and_unlock_achievements(db, user_id)
    
    total = len(crud.get_user_achievement_ids(db, user_id))
    
    # Publish events for each new achievement
    for achievement in newly_unlocked:
        try:
            publish_event("achievement.unlocked", {
                "user_id": user_id,
                "achievement_id": achievement.id,
                "achievement_key": achievement.key,
                "achievement_name_en": achievement.name_en,
                "achievement_name_ar": achievement.name_ar,
                "icon": achievement.icon,
                "points_reward": achievement.points_reward,
            })
        except Exception as e:
            logger.error(f"Failed to publish achievement event: {e}")
    
    if newly_unlocked:
        logger.info(f"User {user_id} unlocked {len(newly_unlocked)} new achievements")
    
    return {
        "new_achievements": newly_unlocked,
        "total_unlocked": total,
    }


# ============================================================
# Weekly Challenges
# ============================================================

@app.get("/challenges/active", response_model=List[schemas.ChallengeWithProgress])
async def get_active_challenges(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get all active weekly challenges with user progress"""
    challenges = crud.get_active_challenges(db)
    result = []
    for ch in challenges:
        progress = crud.get_or_create_progress(db, user_id, ch.id)
        pct = min(100.0, (progress.current_value / ch.target_value * 100)) if ch.target_value > 0 else 0
        result.append(schemas.ChallengeWithProgress(
            id=ch.id,
            title_en=ch.title_en,
            title_ar=ch.title_ar,
            description_en=ch.description_en,
            description_ar=ch.description_ar,
            icon=ch.icon,
            condition_type=ch.condition_type,
            target_value=ch.target_value,
            bonus_points=ch.bonus_points,
            week_start=ch.week_start,
            week_end=ch.week_end,
            is_active=ch.is_active,
            created_at=ch.created_at,
            current_value=progress.current_value,
            completed=progress.completed,
            completed_at=progress.completed_at,
            progress_percent=round(pct, 1),
        ))
    return result


@app.post("/challenges/check", response_model=schemas.ChallengeCheckResult)
async def check_challenges(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Check and complete any weekly challenges"""
    newly_completed = crud.check_and_complete_challenges(db, user_id)

    # Publish events
    for challenge in newly_completed:
        try:
            publish_event("challenge.completed", {
                "user_id": user_id,
                "challenge_id": challenge.id,
                "challenge_title_en": challenge.title_en,
                "bonus_points": challenge.bonus_points,
            })
        except Exception as e:
            logger.error(f"Failed to publish challenge event: {e}")

    if newly_completed:
        logger.info(f"User {user_id} completed {len(newly_completed)} challenges")

    # Get totals
    active = crud.get_active_challenges(db)
    completed_count = 0
    for ch in active:
        prog = crud.get_user_challenge_progress(db, user_id, ch.id)
        if prog and prog.completed:
            completed_count += 1

    return {
        "completed_challenges": newly_completed,
        "total_active": len(active),
        "total_completed": completed_count,
    }


# ============================================================
# Friends / Social
# ============================================================

@app.post("/friends/request")
async def send_friend_request(
    request: schemas.FriendRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Send a friend request"""
    if request.friend_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot add yourself as friend")
    friendship = crud.send_friend_request(db, user_id, request.friend_id)
    return {"status": "ok", "friendship_id": friendship.id, "current_status": friendship.status}


@app.get("/friends/requests", response_model=List[schemas.FriendshipResponse])
async def get_pending_requests(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get pending incoming friend requests"""
    requests = crud.get_pending_requests(db, user_id)
    result = []
    for r in requests:
        result.append(schemas.FriendshipResponse(
            id=r.id,
            user_id=r.user_id,
            friend_id=r.friend_id,
            status=r.status,
            created_at=r.created_at,
            friend_name="",
            friend_points=0,
        ))
    return result


@app.post("/friends/{friendship_id}/accept")
async def accept_request(
    friendship_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Accept a friend request"""
    f = crud.accept_friend_request(db, friendship_id, user_id)
    if not f:
        raise HTTPException(status_code=404, detail="Request not found or already handled")
    return {"status": "accepted", "friendship_id": f.id}


@app.post("/friends/{friendship_id}/reject")
async def reject_request(
    friendship_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Reject or remove a friendship"""
    f = crud.reject_friend_request(db, friendship_id, user_id)
    if not f:
        raise HTTPException(status_code=404, detail="Friendship not found")
    return {"status": "removed"}


@app.get("/friends")
async def get_friends(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get all friends"""
    friendships = crud.get_friends(db, user_id)
    result = []
    for f in friendships:
        fid = f.friend_id if f.user_id == user_id else f.user_id
        result.append({
            "friendship_id": f.id,
            "friend_user_id": fid,
            "status": f.status,
            "created_at": f.created_at.isoformat() if f.created_at else None,
        })
    return result


@app.get("/friends/leaderboard", response_model=List[schemas.FriendLeaderboardEntry])
async def friend_leaderboard(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get leaderboard among friends only"""
    entries = crud.get_friend_leaderboard(db, user_id)
    return [schemas.FriendLeaderboardEntry(**e) for e in entries]


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
    count_cp = db.query(models.UserChallengeProgress).filter(
        models.UserChallengeProgress.user_id == user_id
    ).delete()
    count_fr = db.query(models.Friendship).filter(
        (models.Friendship.user_id == user_id) | (models.Friendship.friend_id == user_id)
    ).delete(synchronize_session='fetch')
    count_ua = db.query(models.UserAchievement).filter(
        models.UserAchievement.user_id == user_id
    ).delete()
    db.commit()

    logger.info(f"DSGVO: Deleted {count} transactions, {count_cp} challenge progress, {count_fr} friendships, {count_ua} achievements for user {user_id}")
    return {"user_id": user_id, "deleted": {"point_transactions": count, "challenge_progress": count_cp, "friendships": count_fr, "achievements": count_ua}}


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