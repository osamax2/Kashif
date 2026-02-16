from datetime import datetime

from database import Base
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship


class PointTransaction(Base):
    __tablename__ = "point_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    report_id = Column(Integer, nullable=True)  # Foreign key to reports if applicable
    type = Column(String(50), nullable=False)  # REPORT_CREATED, CONFIRMATION, REDEMPTION, etc.
    points = Column(Integer, nullable=False)  # Positive for earning, negative for spending
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(50), unique=True, nullable=False)  # e.g., "first_report"
    name_en = Column(String(100), nullable=False)
    name_ar = Column(String(100), nullable=False)
    description_en = Column(Text, nullable=True)
    description_ar = Column(Text, nullable=True)
    icon = Column(String(10), nullable=False, default="🏆")
    category = Column(String(30), nullable=False, default="general")  # reporting, confirming, general
    condition_type = Column(String(30), nullable=False)  # report_count, confirm_count, night_report, pothole_count
    condition_value = Column(Integer, nullable=False, default=1)  # e.g., 10 for "10 reports"
    points_reward = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user_achievements = relationship("UserAchievement", back_populates="achievement")


class UserAchievement(Base):
    __tablename__ = "user_achievements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    achievement_id = Column(Integer, ForeignKey("achievements.id"), nullable=False)
    unlocked_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    achievement = relationship("Achievement", back_populates="user_achievements")


# ── Weekly Challenges ────────────────────────────────────────────────

class WeeklyChallenge(Base):
    __tablename__ = "weekly_challenges"

    id = Column(Integer, primary_key=True, index=True)
    title_en = Column(String(150), nullable=False)
    title_ar = Column(String(150), nullable=False)
    description_en = Column(Text, nullable=True)
    description_ar = Column(Text, nullable=True)
    icon = Column(String(10), nullable=False, default="🎯")
    condition_type = Column(String(30), nullable=False)  # report_count, confirm_count
    target_value = Column(Integer, nullable=False, default=5)
    bonus_points = Column(Integer, nullable=False, default=50)
    week_start = Column(DateTime, nullable=False)
    week_end = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    progress = relationship("UserChallengeProgress", back_populates="challenge")


class UserChallengeProgress(Base):
    __tablename__ = "user_challenge_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    challenge_id = Column(Integer, ForeignKey("weekly_challenges.id"), nullable=False)
    current_value = Column(Integer, nullable=False, default=0)
    completed = Column(Boolean, default=False, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    challenge = relationship("WeeklyChallenge", back_populates="progress")

    __table_args__ = (
        UniqueConstraint("user_id", "challenge_id", name="uq_user_challenge"),
    )


# ── Friends / Social ────────────────────────────────────────────────

class Friendship(Base):
    __tablename__ = "friendships"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    friend_id = Column(Integer, nullable=False, index=True)
    status = Column(String(20), nullable=False, default="pending")  # pending, accepted, rejected
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "friend_id", name="uq_friendship"),
    )
