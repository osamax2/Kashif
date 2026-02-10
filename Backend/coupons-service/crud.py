import secrets
import string
from typing import List, Optional

import models
import schemas
from sqlalchemy.orm import Session


def generate_redemption_code(length: int = 12) -> str:
    """Generate a unique redemption code"""
    characters = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(characters) for _ in range(length))


# Company CRUD
def create_company(db: Session, company: schemas.CompanyCreate):
    db_company = models.Company(**company.dict())
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company


def get_companies(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Company).filter(
        models.Company.status != "DELETED"
    ).offset(skip).limit(limit).all()


def get_company(db: Session, company_id: int):
    return db.query(models.Company).filter(models.Company.id == company_id).first()


def update_company(db: Session, company_id: int, company_update: schemas.CompanyUpdate):
    company = get_company(db, company_id)
    if not company:
        return None
    
    update_data = company_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(company, field, value)
    
    db.commit()
    db.refresh(company)
    return company


def delete_company(db: Session, company_id: int):
    company = get_company(db, company_id)
    if not company:
        return None
    
    company.status = "DELETED"
    db.commit()
    db.refresh(company)
    return company


# Category CRUD
def create_category(db: Session, category: schemas.CouponCategoryCreate):
    db_category = models.CouponCategory(**category.dict())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category


def get_categories(db: Session):
    return db.query(models.CouponCategory).all()


def get_category(db: Session, category_id: int):
    return db.query(models.CouponCategory).filter(models.CouponCategory.id == category_id).first()


def update_category(db: Session, category_id: int, category_update: schemas.CouponCategoryUpdate):
    category = get_category(db, category_id)
    if not category:
        return None
    
    update_data = category_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)
    
    db.commit()
    db.refresh(category)
    return category


def delete_category(db: Session, category_id: int):
    category = get_category(db, category_id)
    if not category:
        return None
    
    category.status = "DELETED"
    db.commit()
    db.refresh(category)
    return category


# Coupon CRUD
def create_coupon(db: Session, coupon: schemas.CouponCreate):
    db_coupon = models.Coupon(**coupon.dict())
    db.add(db_coupon)
    db.commit()
    db.refresh(db_coupon)
    return db_coupon


def get_coupon(db: Session, coupon_id: int):
    return db.query(models.Coupon).filter(models.Coupon.id == coupon_id).first()


def get_coupons(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    coupon_category_id: Optional[int] = None,
    company_id: Optional[int] = None
):
    query = db.query(models.Coupon).filter(models.Coupon.status == "ACTIVE")
    
    if coupon_category_id:
        query = query.filter(models.Coupon.coupon_category_id == coupon_category_id)
    
    if company_id:
        query = query.filter(models.Coupon.company_id == company_id)
    
    return query.order_by(models.Coupon.created_at.desc()).offset(skip).limit(limit).all()


def get_all_company_coupons(db: Session, company_id: int):
    """Get all coupons for a specific company (including non-active)"""
    return db.query(models.Coupon).filter(
        models.Coupon.company_id == company_id,
        models.Coupon.status != "DELETED"
    ).order_by(models.Coupon.created_at.desc()).all()


def update_coupon(db: Session, coupon_id: int, coupon_update: schemas.CouponUpdate):
    """Update coupon fields (admin only)"""
    coupon = get_coupon(db, coupon_id)
    if not coupon:
        return None
    
    # Update only provided fields
    update_data = coupon_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(coupon, field, value)
    
    db.commit()
    db.refresh(coupon)
    return coupon


def delete_coupon(db: Session, coupon_id: int):
    """Soft delete coupon by setting status to DELETED"""
    coupon = get_coupon(db, coupon_id)
    if not coupon:
        return None
    
    coupon.status = "DELETED"
    db.commit()
    db.refresh(coupon)
    return coupon


def get_deleted_coupons(db: Session, company_id: int = None):
    """Get all soft-deleted coupons, optionally filtered by company"""
    query = db.query(models.Coupon).filter(models.Coupon.status == "DELETED")
    if company_id:
        query = query.filter(models.Coupon.company_id == company_id)
    return query.order_by(models.Coupon.created_at.desc()).all()


def restore_coupon(db: Session, coupon_id: int):
    """Restore a soft-deleted coupon"""
    coupon = db.query(models.Coupon).filter(models.Coupon.id == coupon_id).first()
    if not coupon:
        return None
    
    coupon.status = "ACTIVE"
    db.commit()
    db.refresh(coupon)
    return coupon


def permanent_delete_coupon(db: Session, coupon_id: int):
    """Permanently delete a coupon from the database"""
    coupon = db.query(models.Coupon).filter(models.Coupon.id == coupon_id).first()
    if not coupon:
        return None
    
    db.delete(coupon)
    db.commit()
    return True


# Redemption CRUD
def create_redemption(db: Session, user_id: int, coupon_id: int, points_spent: int):
    # Generate unique verification code
    verification_code = generate_redemption_code(16)
    
    # Make sure the code is unique
    while db.query(models.CouponRedemption).filter(
        models.CouponRedemption.verification_code == verification_code
    ).first():
        verification_code = generate_redemption_code(16)
    
    db_redemption = models.CouponRedemption(
        user_id=user_id,
        coupon_id=coupon_id,
        points_spent=points_spent,
        verification_code=verification_code
    )
    db.add(db_redemption)
    db.commit()
    db.refresh(db_redemption)
    return db_redemption


def get_redemption_by_code(db: Session, verification_code: str):
    """Get redemption by verification code"""
    return db.query(models.CouponRedemption).filter(
        models.CouponRedemption.verification_code == verification_code
    ).first()


def verify_redemption(db: Session, verification_code: str, verified_by: int, company_id: int):
    """Verify a redemption - mark it as VERIFIED"""
    from datetime import datetime
    
    redemption = get_redemption_by_code(db, verification_code)
    if not redemption:
        return None, "Redemption not found"
    
    # Check if already verified
    if redemption.status == "VERIFIED":
        return None, "Coupon already verified"
    
    # Check if expired or canceled
    if redemption.status in ["EXPIRED", "CANCELED"]:
        return None, f"Coupon is {redemption.status.lower()}"
    
    # Check if coupon belongs to the company
    coupon = get_coupon(db, redemption.coupon_id)
    if not coupon:
        return None, "Coupon not found"
    
    if coupon.company_id != company_id:
        return None, "This coupon does not belong to your company"
    
    # Verify the redemption
    redemption.status = "VERIFIED"
    redemption.verified_at = datetime.utcnow()
    redemption.verified_by = verified_by
    
    db.commit()
    db.refresh(redemption)
    
    return redemption, None


def get_user_redemption(db: Session, user_id: int, coupon_id: int):
    return db.query(models.CouponRedemption).filter(
        models.CouponRedemption.user_id == user_id,
        models.CouponRedemption.coupon_id == coupon_id
    ).first()


def get_user_redemptions(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.CouponRedemption).filter(
        models.CouponRedemption.user_id == user_id
    ).order_by(models.CouponRedemption.redeemed_at.desc()).offset(skip).limit(limit).all()


def get_all_redemptions(db: Session, skip: int = 0, limit: int = 10000):
    """Get all redemptions for analytics"""
    return db.query(models.CouponRedemption).order_by(
        models.CouponRedemption.redeemed_at.desc()
    ).offset(skip).limit(limit).all()


def get_redemptions_by_company(db: Session):
    """Get redemption counts grouped by company"""
    from sqlalchemy import func
    
    results = db.query(
        models.Company.id,
        models.Company.name,
        models.Company.logo_url,
        func.count(models.CouponRedemption.id).label('redemption_count')
    ).join(
        models.Coupon, models.Company.id == models.Coupon.company_id
    ).join(
        models.CouponRedemption, models.Coupon.id == models.CouponRedemption.coupon_id
    ).group_by(
        models.Company.id, models.Company.name, models.Company.logo_url
    ).order_by(
        func.count(models.CouponRedemption.id).desc()
    ).all()
    
    return [
        {
            "company_id": r[0],
            "company_name": r[1],
            "logo_url": r[2],
            "redemption_count": r[3]
        }
        for r in results
    ]


def get_company_coupon_stats(db: Session, company_id: int, start_date=None, end_date=None):
    """Get coupon redemption statistics for a specific company"""
    from sqlalchemy import func
    from datetime import datetime, timedelta
    
    # Base query for coupon stats
    query = db.query(
        models.Coupon.id,
        models.Coupon.title,
        models.Coupon.title_ar,
        models.Coupon.points_cost,
        func.count(models.CouponRedemption.id).label('redemption_count'),
        func.max(models.CouponRedemption.redeemed_at).label('last_redeemed')
    ).outerjoin(
        models.CouponRedemption, models.Coupon.id == models.CouponRedemption.coupon_id
    ).filter(
        models.Coupon.company_id == company_id,
        models.Coupon.status == "ACTIVE"
    )
    
    # Apply date filters if provided
    if start_date:
        query = query.filter(
            (models.CouponRedemption.redeemed_at >= start_date) | 
            (models.CouponRedemption.redeemed_at.is_(None))
        )
    if end_date:
        query = query.filter(
            (models.CouponRedemption.redeemed_at <= end_date) | 
            (models.CouponRedemption.redeemed_at.is_(None))
        )
    
    results = query.group_by(
        models.Coupon.id, models.Coupon.title, models.Coupon.title_ar, models.Coupon.points_cost
    ).order_by(
        func.count(models.CouponRedemption.id).desc()
    ).all()
    
    return [
        {
            "coupon_id": r[0],
            "title": r[1],
            "title_ar": r[2],
            "points_cost": r[3],
            "redemption_count": r[4],
            "last_redeemed": r[5].isoformat() if r[5] else None
        }
        for r in results
    ]


def get_company_redemptions_over_time(db: Session, company_id: int, days: int = 30):
    """Get daily redemption counts for a company over time"""
    from sqlalchemy import func, cast, Date
    from datetime import datetime, timedelta
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    results = db.query(
        cast(models.CouponRedemption.redeemed_at, Date).label('date'),
        func.count(models.CouponRedemption.id).label('count')
    ).join(
        models.Coupon, models.CouponRedemption.coupon_id == models.Coupon.id
    ).filter(
        models.Coupon.company_id == company_id,
        models.CouponRedemption.redeemed_at >= start_date
    ).group_by(
        cast(models.CouponRedemption.redeemed_at, Date)
    ).order_by(
        cast(models.CouponRedemption.redeemed_at, Date)
    ).all()
    
    return [
        {
            "date": r[0].isoformat() if r[0] else None,
            "count": r[1]
        }
        for r in results
    ]


def get_company_stats_summary(db: Session, company_id: int):
    """Get summary statistics for a company"""
    from sqlalchemy import func
    
    # Total coupons
    total_coupons = db.query(func.count(models.Coupon.id)).filter(
        models.Coupon.company_id == company_id,
        models.Coupon.status == "ACTIVE"
    ).scalar() or 0
    
    # Total redemptions
    total_redemptions = db.query(func.count(models.CouponRedemption.id)).join(
        models.Coupon, models.CouponRedemption.coupon_id == models.Coupon.id
    ).filter(
        models.Coupon.company_id == company_id
    ).scalar() or 0
    
    # Total points spent on company coupons
    total_points = db.query(func.sum(models.CouponRedemption.points_spent)).join(
        models.Coupon, models.CouponRedemption.coupon_id == models.Coupon.id
    ).filter(
        models.Coupon.company_id == company_id
    ).scalar() or 0
    
    return {
        "total_coupons": total_coupons,
        "total_redemptions": total_redemptions,
        "total_points_spent": total_points
    }
