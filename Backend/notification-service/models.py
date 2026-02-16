from datetime import datetime

from database import Base
from sqlalchemy import (Boolean, Column, DateTime, ForeignKey, Integer, String,
                        Text)
from sqlalchemy.orm import relationship


class UserNotificationPreferences(Base):
    __tablename__ = "user_notification_preferences"

    user_id = Column(Integer, primary_key=True)
    report_notifications = Column(Boolean, default=True, nullable=False)
    status_updates = Column(Boolean, default=True, nullable=False)
    points_notifications = Column(Boolean, default=True, nullable=False)
    coupon_notifications = Column(Boolean, default=True, nullable=False)
    general_notifications = Column(Boolean, default=True, nullable=False)
    quiet_hours_enabled = Column(Boolean, default=False, nullable=False)
    quiet_hours_start = Column(Integer, default=22)  # 0-23
    quiet_hours_end = Column(Integer, default=7)  # 0-23


class DeviceToken(Base):
    __tablename__ = "device_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    token = Column(String, nullable=False, unique=True)
    device_type = Column(String, nullable=False)  # ios, android, web
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    title = Column(String(150), nullable=False)
    body = Column(Text, nullable=False)
    title_en = Column(String(150), nullable=True)
    body_en = Column(Text, nullable=True)
    type = Column(String(50), nullable=False)  # REPORT_UPDATE, POINTS_AWARDED, etc.
    related_report_id = Column(Integer, nullable=True)
    related_coupon_id = Column(Integer, nullable=True)
    is_read = Column(Boolean, default=False, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)
