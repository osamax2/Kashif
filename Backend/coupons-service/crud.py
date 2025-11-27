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


# Category CRUD
def create_category(db: Session, category: schemas.CouponCategoryCreate):
    db_category = models.CouponCategory(**category.dict())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category


def get_categories(db: Session):
    return db.query(models.CouponCategory).all()


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
    ).order_by(models.CouponRedemption.redeemed_at.desc()).offset(skip).limit(limit).all()
