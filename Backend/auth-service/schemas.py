from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class LevelBase(BaseModel):
    name: str
    min_report_number: int


class Level(LevelBase):
    id: int

    class Config:
        from_attributes = True


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    role: str = "USER"
    company_id: Optional[int] = None  # For COMPANY role users
    language: str = "ar"  # ar or en


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int
    total_points: int
    image_url: Optional[str] = None
    level_id: Optional[int] = None
    company_id: Optional[int] = None
    status: str
    is_verified: bool = False
    must_change_password: bool = False
    language: str
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    must_change_password: bool = False


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None


class LanguageUpdate(BaseModel):
    language: str  # ar or en


class UserUpdate(BaseModel):
    """Schema for updating user by admin"""
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    company_id: Optional[int] = None
    status: Optional[str] = None
    language: Optional[str] = None


class CompanyUserCreate(BaseModel):
    """Schema for creating a company user by admin"""
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    company_id: int  # Required - must link to a company
    language: str = "ar"


class GovernmentUserCreate(BaseModel):
    """Schema for creating a government employee by admin"""
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    language: str = "ar"


class VerifyAccountRequest(BaseModel):
    """Schema for account verification via token"""
    token: str


class ChangePasswordRequest(BaseModel):
    """Schema for changing password"""
    current_password: str
    new_password: str


class ForceChangePasswordRequest(BaseModel):
    """Schema for first-time password change (no current password required)"""
    new_password: str


class ResendVerificationRequest(BaseModel):
    """Schema for resending verification email"""
    email: EmailStr


class CompanyMemberCreate(BaseModel):
    """Schema for adding a member to company by company user"""
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    language: str = "ar"
    max_users: Optional[int] = 5  # Pass current limit for validation
