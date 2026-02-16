from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


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


# ── Achievement Schemas ──────────────────────────────────────────────

class AchievementBase(BaseModel):
    key: str
    name_en: str
    name_ar: str
    description_en: Optional[str] = None
    description_ar: Optional[str] = None
    icon: str = "🏆"
    category: str = "general"
    condition_type: str
    condition_value: int = 1
    points_reward: int = 0


class AchievementResponse(AchievementBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserAchievementResponse(BaseModel):
    id: int
    user_id: int
    achievement_id: int
    unlocked_at: datetime
    achievement: AchievementResponse

    class Config:
        from_attributes = True


class AchievementWithStatus(AchievementResponse):
    """Achievement with user-specific unlock status"""
    unlocked: bool = False
    unlocked_at: Optional[datetime] = None


class AchievementCheckResult(BaseModel):
    new_achievements: List[AchievementResponse] = []
    total_unlocked: int = 0


# ── Weekly Challenge Schemas ─────────────────────────────────────────

class WeeklyChallengeBase(BaseModel):
    title_en: str
    title_ar: str
    description_en: Optional[str] = None
    description_ar: Optional[str] = None
    icon: str = "🎯"
    condition_type: str
    target_value: int = 5
    bonus_points: int = 50


class WeeklyChallengeResponse(WeeklyChallengeBase):
    id: int
    week_start: datetime
    week_end: datetime
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ChallengeWithProgress(WeeklyChallengeResponse):
    """Challenge with user-specific progress"""
    current_value: int = 0
    completed: bool = False
    completed_at: Optional[datetime] = None
    progress_percent: float = 0.0


class ChallengeCheckResult(BaseModel):
    completed_challenges: List[WeeklyChallengeResponse] = []
    total_active: int = 0
    total_completed: int = 0


# ── Friends / Social Schemas ────────────────────────────────────────

class FriendRequest(BaseModel):
    friend_id: int


class FriendshipResponse(BaseModel):
    id: int
    user_id: int
    friend_id: int
    status: str
    created_at: datetime
    friend_name: Optional[str] = None
    friend_points: Optional[int] = None

    class Config:
        from_attributes = True


class FriendLeaderboardEntry(BaseModel):
    user_id: int
    full_name: Optional[str] = None
    total_points: int
    rank: int
