from datetime import datetime

from database import Base
from sqlalchemy import (Boolean, Column, DateTime, ForeignKey, Integer, String,
                        Text)
from sqlalchemy.orm import relationship


class UserNotificationStatus(Base):
    __tablename__ = "user_notification_status"

    user_id = Column(Integer, nullable=False, primary_key=True)
    notification_type = Column(String(50), nullable=False, primary_key=True)
    status = Column(Boolean, default=True, nullable=False)


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
    type = Column(String(50), nullable=False)  # REPORT_UPDATE, POINTS_AWARDED, etc.
    related_report_id = Column(Integer, nullable=True)
    related_coupon_id = Column(Integer, nullable=True)
    is_read = Column(Boolean, default=False, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)
    is_read = Column(Boolean, default=False, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)
