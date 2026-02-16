from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class NotificationPreferences(BaseModel):
    report_notifications: bool = True
    status_updates: bool = True
    points_notifications: bool = True
    coupon_notifications: bool = True
    general_notifications: bool = True
    quiet_hours_enabled: bool = False
    quiet_hours_start: int = 22  # 0-23
    quiet_hours_end: int = 7  # 0-23


class NotificationPreferencesResponse(NotificationPreferences):
    user_id: int

    class Config:
        from_attributes = True


class DeviceTokenCreate(BaseModel):
    token: str
    device_type: str


class DeviceToken(BaseModel):
    id: int
    user_id: int
    token: str
    device_type: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationCreate(BaseModel):
    user_id: int
    title: str
    body: str
    type: str
    related_report_id: Optional[int] = None
    related_coupon_id: Optional[int] = None


class BroadcastNotificationCreate(BaseModel):
    title: str
    body: str
    type: str
    target_role: Optional[str] = None  # None = all users, "USER" = regular users, "COMPANY" = company users, "GOVERNMENT" = government employees


class Notification(BaseModel):
    id: int
    user_id: int
    title: str
    body: str
    title_en: Optional[str] = None
    body_en: Optional[str] = None
    type: str
    related_report_id: Optional[int] = None
    related_coupon_id: Optional[int] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
