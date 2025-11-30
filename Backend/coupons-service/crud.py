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
        models.Company.status == "ACTIVE"
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


# Redemption CRUD
def create_redemption(db: Session, user_id: int, coupon_id: int, points_spent: int):
    db_redemption = models.CouponRedemption(
        user_id=user_id,
        coupon_id=coupon_id,
        points_spent=points_spent
    )
    db.add(db_redemption)
    db.commit()
    db.refresh(db_redemption)
    return db_redemption


def get_user_redemption(db: Session, user_id: int, coupon_id: int):
    return db.query(models.CouponRedemption).filter(
        models.CouponRedemption.user_id == user_id,
        models.CouponRedemption.coupon_id == coupon_id
    ).first()


def get_user_redemptions(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.CouponRedemption).filter(
        models.CouponRedemption.user_id == user_id
    ).order_by(models.CouponRedemption.redeemed_at.desc()).offset(skip).limit(limit).all()
