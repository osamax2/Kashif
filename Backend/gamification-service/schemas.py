from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class PointTransaction(BaseModel):
    id: int
    user_id: int
    report_id: Optional[int] = None
    type: str
    points: int
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserPoints(BaseModel):
    user_id: int
    total_points: int


class PointAward(BaseModel):
    user_id: int
    points: int
    description: Optional[str] = None


class PointRedemption(BaseModel):
    points: int
    coupon_id: int


class LeaderboardEntry(BaseModel):
    user_id: int
    total_points: int
    rank: int

    class Config:
        from_attributes = True
