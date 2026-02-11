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
    city: Optional[str] = None
    district: Optional[str] = None
    job_description: Optional[str] = None
    status: str
    is_verified: bool = False
    must_change_password: bool = False
    language: str
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None  # Soft delete timestamp

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
    email: Optional[EmailStr] = None
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
    city: Optional[str] = None
    district: Optional[str] = None
    job_description: Optional[str] = None
    company_id: int  # Required - must link to a company
    language: str = "ar"


class GovernmentUserCreate(BaseModel):
    """Schema for creating a government employee by admin"""
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    job_description: Optional[str] = None
    language: str = "ar"


class NormalUserCreate(BaseModel):
    """Schema for creating a normal user by admin"""
    email: EmailStr
    password: str
    full_name: str
    phone: str  # Required for normal users
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


class AdminResetPasswordRequest(BaseModel):
    """Schema for admin to reset any user's password"""
    new_password: str


class AdminUserCreate(BaseModel):
    """Schema for admin to create a new admin user"""
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    language: str = "ar"


class ResendVerificationRequest(BaseModel):
    """Schema for resending verification email"""
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    """Schema for requesting password reset email"""
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Schema for resetting password with token"""
    token: str
    new_password: str


class CompanyMemberCreate(BaseModel):
    """Schema for adding a member to company by company user"""
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    language: str = "ar"
    max_users: Optional[int] = 5  # Pass current limit for validation
