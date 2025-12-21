from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CompanyBase(BaseModel):
    name: str
    logo_url: Optional[str] = None
    description: Optional[str] = None
    website_url: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    """Schema for updating company"""
    name: Optional[str] = None
    logo_url: Optional[str] = None
    description: Optional[str] = None
    website_url: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = None


class Company(CompanyBase):
    id: int
    status: str
    max_users: int = 5
    created_at: datetime

    class Config:
        from_attributes = True


class CouponCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    icon_name: Optional[str] = None
    sort_order: Optional[int] = None


class CouponCategoryCreate(CouponCategoryBase):
    pass


class CouponCategoryUpdate(BaseModel):
    """Schema for updating category"""
    name: Optional[str] = None
    description: Optional[str] = None
    icon_name: Optional[str] = None
    sort_order: Optional[int] = None
    status: Optional[str] = None


class CouponCategory(CouponCategoryBase):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class CouponBase(BaseModel):
    company_id: int
    coupon_category_id: Optional[int] = None
    name: str
    description: str
    points_cost: int
    image_url: Optional[str] = None
    expiration_date: Optional[datetime] = None
    max_usage_per_user: Optional[int] = None
    total_available: Optional[int] = None


class CouponCreate(CouponBase):
    pass


class CouponUpdate(BaseModel):
    """Schema for updating coupon by admin"""
    company_id: Optional[int] = None
    coupon_category_id: Optional[int] = None
    name: Optional[str] = None
    description: Optional[str] = None
    points_cost: Optional[int] = None
    image_url: Optional[str] = None
    expiration_date: Optional[datetime] = None
    max_usage_per_user: Optional[int] = None
    total_available: Optional[int] = None
    status: Optional[str] = None


class Coupon(CouponBase):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class CouponRedemption(BaseModel):
    id: int
    user_id: int
    coupon_id: int
    points_spent: int
    verification_code: str
    status: str
    verified_at: Optional[datetime] = None
    verified_by: Optional[int] = None
    redeemed_at: datetime

    class Config:
        from_attributes = True


class CouponRedemptionVerify(BaseModel):
    verification_code: str


class CouponRedemptionVerifyResponse(BaseModel):
    success: bool
    message: str
    redemption: Optional[CouponRedemption] = None
    coupon_name: Optional[str] = None
    company_name: Optional[str] = None
    user_id: Optional[int] = None
    points_spent: Optional[int] = None
