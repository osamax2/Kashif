from datetime import datetime

from database import Base
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
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
