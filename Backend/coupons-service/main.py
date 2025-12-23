import logging
import threading
from typing import Annotated, List, Optional

import auth_client
import crud
import gamification_client
import models
import schemas
from database import engine, get_db
from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from rabbitmq_consumer import start_consumer
from rabbitmq_publisher import publish_event
from sqlalchemy.orm import Session

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Coupons Service", redirect_slashes=False)

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


async def get_current_user(authorization: Annotated[str, Header()]):
    """Verify token and return full user info including company_id and role"""
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
    return user


async def get_user_role(authorization: Annotated[str, Header()]) -> str:
    """Get user role from token"""
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
    return user.get("role", "USER")


async def get_user_company_id(authorization: Annotated[str, Header()]) -> Optional[int]:
    """Get user company_id from token"""
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
    return user.get("company_id")


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


@app.patch("/companies/{company_id}", response_model=schemas.Company)
async def update_company(
    company_id: int,
    company_update: schemas.CompanyUpdate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Update a company (admin only)"""
    company = crud.update_company(db=db, company_id=company_id, company_update=company_update)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@app.delete("/companies/{company_id}", response_model=schemas.Company)
async def delete_company(
    company_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Delete a company (soft delete, admin only)"""
    company = crud.delete_company(db=db, company_id=company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@app.get("/companies/{company_id}/coupons", response_model=List[schemas.Coupon])
async def get_company_coupons(
    company_id: int,
    authorization: Annotated[str | None, Header()] = None,
    db: Session = Depends(get_db)
):
    """Get all coupons for a specific company.
    If user is COMPANY role, they can only view their own company's coupons."""
    
    # Check if user is COMPANY role and can only view their own company
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "")
        user = await auth_client.verify_token(token)
        if user and user.get("role") == "COMPANY":
            if user.get("company_id") != company_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only view coupons for your own company"
                )
    
    return crud.get_all_company_coupons(db=db, company_id=company_id)


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


@app.patch("/categories/{category_id}", response_model=schemas.CouponCategory)
async def update_category(
    category_id: int,
    category_update: schemas.CouponCategoryUpdate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Update a category (admin only)"""
    category = crud.update_category(db=db, category_id=category_id, category_update=category_update)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@app.delete("/categories/{category_id}", response_model=schemas.CouponCategory)
async def delete_category(
    category_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Delete a category (soft delete, admin only)"""
    category = crud.delete_category(db=db, category_id=category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


# Coupon endpoints
@app.post("/", response_model=schemas.Coupon)
async def create_coupon(
    coupon: schemas.CouponCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new coupon (admin or company user for their own company)"""
    # If user is COMPANY role, they can only create coupons for their company
    if current_user.get("role") == "COMPANY":
        user_company_id = current_user.get("company_id")
        if not user_company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Company user has no assigned company"
            )
        if coupon.company_id != user_company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only create coupons for your own company"
            )
    return crud.create_coupon(db=db, coupon=coupon)


@app.get("/", response_model=List[schemas.Coupon])
async def get_coupons(
    skip: int = 0,
    limit: int = 100,
    coupon_category_id: Optional[int] = None,
    company_id: Optional[int] = None,
    authorization: Annotated[str | None, Header()] = None,
    db: Session = Depends(get_db)
):
    """Get all available coupons with filters.
    If user is COMPANY role, only returns coupons for their company."""
    
    # Check if there's an auth header and if user is COMPANY role
    filter_company_id = company_id
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "")
        user = await auth_client.verify_token(token)
        if user and user.get("role") == "COMPANY":
            # Force filter to their company only
            filter_company_id = user.get("company_id")
    
    return crud.get_coupons(
        db=db,
        skip=skip,
        limit=limit,
        coupon_category_id=coupon_category_id,
        company_id=filter_company_id
    )


# IMPORTANT: This route must be defined BEFORE /{coupon_id} to avoid path conflicts
@app.get("/trash", response_model=List[schemas.Coupon])
async def get_deleted_coupons(
    company_id: Optional[int] = None,
    user_role: str = Depends(get_user_role),
    user_company_id: Optional[int] = Depends(get_user_company_id),
    db: Session = Depends(get_db)
):
    """Get soft-deleted coupons (admin sees all, company sees own)"""
    if user_role == "COMPANY":
        return crud.get_deleted_coupons(db=db, company_id=user_company_id)
    return crud.get_deleted_coupons(db=db, company_id=company_id)


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


@app.patch("/{coupon_id}", response_model=schemas.Coupon)
async def update_coupon(
    coupon_id: int,
    coupon_update: schemas.CouponUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update coupon details (admin or company user for their own coupons)"""
    # Get the coupon first to check ownership
    coupon = crud.get_coupon(db=db, coupon_id=coupon_id)
    if not coupon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coupon not found"
        )
    
    # If user is COMPANY role, they can only update their own company's coupons
    if current_user.get("role") == "COMPANY":
        user_company_id = current_user.get("company_id")
        if coupon.company_id != user_company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update coupons for your own company"
            )
        # Also prevent changing the company_id
        if coupon_update.company_id and coupon_update.company_id != user_company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You cannot change the company of a coupon"
            )
    
    updated_coupon = crud.update_coupon(db=db, coupon_id=coupon_id, coupon_update=coupon_update)
    return updated_coupon


@app.delete("/{coupon_id}", response_model=schemas.Coupon)
async def delete_coupon(
    coupon_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Soft delete coupon (admin or company user for their own coupons)"""
    # Get the coupon first to check ownership
    coupon = crud.get_coupon(db=db, coupon_id=coupon_id)
    if not coupon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coupon not found"
        )
    
    # If user is COMPANY role, they can only delete their own company's coupons
    if current_user.get("role") == "COMPANY":
        user_company_id = current_user.get("company_id")
        if coupon.company_id != user_company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete coupons for your own company"
            )
    
    deleted_coupon = crud.delete_coupon(db=db, coupon_id=coupon_id)
    return deleted_coupon


@app.post("/{coupon_id}/restore", response_model=schemas.Coupon)
async def restore_coupon(
    coupon_id: int,
    user_role: str = Depends(get_user_role),
    user_company_id: Optional[int] = Depends(get_user_company_id),
    db: Session = Depends(get_db)
):
    """Restore a soft-deleted coupon"""
    coupon = db.query(models.Coupon).filter(models.Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coupon not found"
        )
    
    # COMPANY users can only restore their own coupons
    if user_role == "COMPANY":
        if coupon.company_id != user_company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only restore coupons for your own company"
            )
    
    restored_coupon = crud.restore_coupon(db=db, coupon_id=coupon_id)
    return restored_coupon


@app.delete("/{coupon_id}/permanent")
async def permanent_delete_coupon(
    coupon_id: int,
    user_role: str = Depends(get_user_role),
    user_company_id: Optional[int] = Depends(get_user_company_id),
    db: Session = Depends(get_db)
):
    """Permanently delete a coupon (admin or company owner only)"""
    coupon = db.query(models.Coupon).filter(models.Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coupon not found"
        )
    
    # COMPANY users can only delete their own coupons
    if user_role == "COMPANY":
        if coupon.company_id != user_company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only permanently delete coupons for your own company"
            )
    
    crud.permanent_delete_coupon(db=db, coupon_id=coupon_id)
    return {"message": "Coupon permanently deleted"}


@app.post("/{coupon_id}/redeem", response_model=schemas.CouponRedemption)
async def redeem_coupon(
    coupon_id: int,
    authorization: Annotated[str, Header()],
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
    
    # Get the points cost
    points_cost = coupon.points_cost or coupon.points_required or 0
    
    # Call gamification service to redeem points
    token = authorization.replace("Bearer ", "")
    redeemed = await gamification_client.redeem_points(token, points_cost, coupon_id)
    
    if not redeemed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to redeem points. You may not have enough points."
        )
    
    redemption = crud.create_redemption(
        db=db,
        user_id=user_id,
        coupon_id=coupon_id,
        points_spent=points_cost
    )
    
    # Publish CouponRedeemed event
    try:
        publish_event("coupon.redeemed", {
            "redemption_id": redemption.id,
            "user_id": user_id,
            "coupon_id": coupon_id,
            "points_spent": points_cost
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


@app.post("/redemptions/verify", response_model=schemas.CouponRedemptionVerifyResponse)
async def verify_redemption(
    verify_data: schemas.CouponRedemptionVerify,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify a coupon redemption by scanning QR code (company users only)"""
    # Only COMPANY users can verify redemptions
    if current_user.get("role") != "COMPANY":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company users can verify redemptions"
        )
    
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Company user has no assigned company"
        )
    
    # Verify the redemption
    redemption, error = crud.verify_redemption(
        db=db,
        verification_code=verify_data.verification_code,
        verified_by=current_user.get("id"),
        company_id=company_id
    )
    
    if error:
        return schemas.CouponRedemptionVerifyResponse(
            success=False,
            message=error
        )
    
    # Get coupon and company details
    coupon = crud.get_coupon(db=db, coupon_id=redemption.coupon_id)
    company = crud.get_company(db=db, company_id=coupon.company_id) if coupon else None
    
    return schemas.CouponRedemptionVerifyResponse(
        success=True,
        message="Coupon verified successfully",
        redemption=redemption,
        coupon_name=coupon.name if coupon else None,
        company_name=company.name if company else None,
        user_id=redemption.user_id,
        points_spent=redemption.points_spent
    )


@app.get("/redemptions/check/{verification_code}")
async def check_redemption_status(
    verification_code: str,
    db: Session = Depends(get_db)
):
    """Check the status of a redemption by verification code (for mobile app)"""
    redemption = crud.get_redemption_by_code(db=db, verification_code=verification_code)
    
    if not redemption:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Redemption not found"
        )
    
    coupon = crud.get_coupon(db=db, coupon_id=redemption.coupon_id)
    company = crud.get_company(db=db, company_id=coupon.company_id) if coupon else None
    
    return {
        "verification_code": redemption.verification_code,
        "status": redemption.status,
        "coupon_name": coupon.name if coupon else None,
        "company_name": company.name if company else None,
        "points_spent": redemption.points_spent,
        "redeemed_at": redemption.redeemed_at.isoformat() if redemption.redeemed_at else None,
        "verified_at": redemption.verified_at.isoformat() if redemption.verified_at else None
    }


@app.get("/redemptions/all")
async def get_all_redemptions(
    skip: int = 0,
    limit: int = 10000,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get all redemptions (admin only)"""
    return crud.get_all_redemptions(db=db, skip=skip, limit=limit)


@app.get("/redemptions/stats/by-company")
async def get_redemptions_by_company(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get redemption counts grouped by company (for analytics)"""
    return crud.get_redemptions_by_company(db=db)


@app.get("/redemptions/stats/company/{company_id}")
async def get_company_coupon_stats(
    company_id: int,
    start_date: str = None,
    end_date: str = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get coupon redemption statistics for a specific company"""
    from datetime import datetime
    
    # If user is COMPANY role, they can only view their own company stats
    if current_user.get("role") == "COMPANY":
        user_company_id = current_user.get("company_id")
        if company_id != user_company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view stats for your own company"
            )
    
    # Parse dates if provided
    parsed_start = None
    parsed_end = None
    if start_date:
        try:
            parsed_start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        except ValueError:
            pass
    if end_date:
        try:
            parsed_end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        except ValueError:
            pass
    
    return crud.get_company_coupon_stats(db=db, company_id=company_id, start_date=parsed_start, end_date=parsed_end)


@app.get("/redemptions/stats/company/{company_id}/over-time")
async def get_company_redemptions_over_time(
    company_id: int,
    days: int = 30,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get daily redemption counts for a company over time"""
    # If user is COMPANY role, they can only view their own company stats
    if current_user.get("role") == "COMPANY":
        user_company_id = current_user.get("company_id")
        if company_id != user_company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view stats for your own company"
            )
    
    return crud.get_company_redemptions_over_time(db=db, company_id=company_id, days=days)


@app.get("/redemptions/stats/company/{company_id}/summary")
async def get_company_stats_summary(
    company_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get summary statistics for a company"""
    # If user is COMPANY role, they can only view their own company stats
    if current_user.get("role") == "COMPANY":
        user_company_id = current_user.get("company_id")
        if company_id != user_company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view stats for your own company"
            )
    
    return crud.get_company_stats_summary(db=db, company_id=company_id)
