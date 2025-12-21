from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class UserNotificationStatusBase(BaseModel):
    user_id: int
    notification_type: str
    status: bool


class UserNotificationStatus(UserNotificationStatusBase):
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
    type: str
    related_report_id: Optional[int] = None
    related_coupon_id: Optional[int] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
        from_attributes = True
