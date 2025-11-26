from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


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


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int
    total_points: int
    image_url: Optional[str] = None
    level_id: Optional[int] = None
    status: str
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None
