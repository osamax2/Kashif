from fastapi import FastAPI, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional
import models
import schemas
import crud
from database import engine, get_db
from rabbitmq_publisher import publish_event
from rabbitmq_consumer import start_consumer
import auth_client
import logging
import threading

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Coupons Service")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Start RabbitMQ consumer
consumer_thread = threading.Thread(target=start_consumer, daemon=True)
consumer_thread.start()


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "coupons"}


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


# Company endpoints
@app.post("/companies", response_model=schemas.Company)
async def create_company(
    company: schemas.CompanyCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Create a new company (admin only)"""
    return crud.create_company(db=db, company=company)


@app.get("/companies", response_model=List[schemas.Company])
async def get_companies(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all companies"""
    return crud.get_companies(db=db, skip=skip, limit=limit)


# Category endpoints
@app.post("/categories", response_model=schemas.CouponCategory)
async def create_category(
    category: schemas.CouponCategoryCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Create a new coupon category"""
    return crud.create_category(db=db, category=category)


@app.get("/categories", response_model=List[schemas.CouponCategory])
async def get_categories(
    db: Session = Depends(get_db)
):
    """Get all categories"""
    return crud.get_categories(db=db)


# Coupon endpoints
@app.post("/", response_model=schemas.Coupon)
async def create_coupon(
    coupon: schemas.CouponCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Create a new coupon (admin/company only)"""
    return crud.create_coupon(db=db, coupon=coupon)


@app.get("/", response_model=List[schemas.Coupon])
async def get_coupons(
    skip: int = 0,
    limit: int = 100,
    coupon_category_id: Optional[int] = None,
    company_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get all available coupons with filters"""
    return crud.get_coupons(
        db=db,
        skip=skip,
        limit=limit,
        coupon_category_id=coupon_category_id,
        company_id=company_id
    )


@app.get("/{coupon_id}", response_model=schemas.Coupon)
async def get_coupon(
    coupon_id: int,
    db: Session = Depends(get_db)
):
    """Get specific coupon details"""
    coupon = crud.get_coupon(db=db, coupon_id=coupon_id)
    if not coupon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coupon not found"
        )
    return coupon


@app.post("/{coupon_id}/redeem", response_model=schemas.CouponRedemption)
async def redeem_coupon(
    coupon_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Redeem a coupon with points"""
    # Get coupon
    coupon = crud.get_coupon(db=db, coupon_id=coupon_id)
    if not coupon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coupon not found"
        )
    
    if not coupon.status == "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Coupon is not active"
        )
    
    # Check if user already redeemed this coupon
    existing_redemption = crud.get_user_redemption(db=db, user_id=user_id, coupon_id=coupon_id)
    if existing_redemption:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already redeemed this coupon"
        )
    
    # TODO: Call gamification service to verify and deduct points
    # For now, just create the redemption
    
    redemption = crud.create_redemption(
        db=db,
        user_id=user_id,
        coupon_id=coupon_id,
        points_spent=coupon.points_cost
    )
    
    # Publish CouponRedeemed event
    try:
        publish_event("coupon.redeemed", {
            "redemption_id": redemption.id,
            "user_id": user_id,
            "coupon_id": coupon_id,
            "points_spent": coupon.points_required
        })
    except Exception as e:
        logger.error(f"Failed to publish CouponRedeemed event: {e}")
    
    return redemption


@app.get("/redemptions/me", response_model=List[schemas.CouponRedemption])
async def get_my_redemptions(
    skip: int = 0,
    limit: int = 100,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get current user's coupon redemptions"""
    return crud.get_user_redemptions(db=db, user_id=user_id, skip=skip, limit=limit)
