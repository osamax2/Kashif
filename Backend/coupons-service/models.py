from datetime import datetime

from database import Base
from sqlalchemy import (Boolean, Column, DateTime, Float, ForeignKey, Integer,
                        String, Text)
from sqlalchemy.orm import relationship


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    logo_url = Column(String(255), nullable=True)
    website_url = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    address = Column(String(255), nullable=True)
    max_users = Column(Integer, default=5, nullable=False)  # Maximum users allowed for this company
    status = Column(String(50), default="ACTIVE", nullable=False)  # ACTIVE, INACTIVE
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    coupons = relationship("Coupon", back_populates="company")


class CouponCategory(Base):
    __tablename__ = "coupon_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(String(255), nullable=True)
    icon_name = Column(String(100), nullable=True)
    sort_order = Column(Integer, nullable=True)
    status = Column(String(50), default="ACTIVE", nullable=False)  # ACTIVE, INACTIVE
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    coupons = relationship("Coupon", back_populates="category")


class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    coupon_category_id = Column(Integer, ForeignKey("coupon_categories.id"), nullable=True)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    points_cost = Column(Integer, nullable=False)
    expiration_date = Column(DateTime, nullable=True)
    image_url = Column(String(255), nullable=True)
    max_usage_per_user = Column(Integer, nullable=True)
    total_available = Column(Integer, nullable=True)
    status = Column(String(50), default="ACTIVE", nullable=False)  # ACTIVE, EXPIRED, DISABLED
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    company = relationship("Company", back_populates="coupons")
    category = relationship("CouponCategory", back_populates="coupons")
    redemptions = relationship("CouponRedemption", back_populates="coupon")


class CouponRedemption(Base):
    __tablename__ = "coupon_redemptions"

    id = Column(Integer, primary_key=True, index=True)
    coupon_id = Column(Integer, ForeignKey("coupons.id"), nullable=False)
    user_id = Column(Integer, nullable=False, index=True)
    points_spent = Column(Integer, nullable=False)
    verification_code = Column(String(32), unique=True, nullable=False, index=True)  # Unique code for QR verification
    status = Column(String(50), default="PENDING", nullable=False)  # PENDING, VERIFIED, EXPIRED, CANCELED
    verified_at = Column(DateTime, nullable=True)  # When the coupon was verified by company
    verified_by = Column(Integer, nullable=True)  # User ID of company employee who verified
    redeemed_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    coupon = relationship("Coupon", back_populates="redemptions")
