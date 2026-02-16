from datetime import datetime
from typing import List, Optional

import models
from sqlalchemy.orm import Session


# ============================================================
# Notification Preferences CRUD
# ============================================================

def get_notification_preferences(db: Session, user_id: int):
    """Get user's notification preferences, create defaults if not exist"""
    prefs = db.query(models.UserNotificationPreferences).filter(
        models.UserNotificationPreferences.user_id == user_id
    ).first()
    
    if not prefs:
        prefs = models.UserNotificationPreferences(user_id=user_id)
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    
    return prefs


def update_notification_preferences(db: Session, user_id: int, updates: dict):
    """Update user's notification preferences"""
    prefs = get_notification_preferences(db, user_id)
    
    for key, value in updates.items():
        if hasattr(prefs, key):
            setattr(prefs, key, value)
    
    db.commit()
    db.refresh(prefs)
    return prefs


def is_notification_enabled(db: Session, user_id: int, notification_type: str) -> bool:
    """Check if a specific notification type is enabled for a user"""
    prefs = get_notification_preferences(db, user_id)
    
    type_mapping = {
        "REPORT_UPDATE": prefs.status_updates,
        "REPORT_CREATED": prefs.report_notifications,
        "POINTS_AWARDED": prefs.points_notifications,
        "COUPON_REDEEMED": prefs.coupon_notifications,
        "WELCOME": prefs.general_notifications,
        "GENERAL": prefs.general_notifications,
    }
    
    return type_mapping.get(notification_type, True)


def is_in_quiet_hours(db: Session, user_id: int) -> bool:
    """Check if user is currently in quiet hours"""
    from datetime import datetime, timezone
    prefs = get_notification_preferences(db, user_id)
    
    if not prefs.quiet_hours_enabled:
        return False
    
    current_hour = datetime.now(timezone.utc).hour
    start = prefs.quiet_hours_start
    end = prefs.quiet_hours_end
    
    if start <= end:
        return start <= current_hour < end
    else:  # Wraps midnight (e.g., 22-7)
        return current_hour >= start or current_hour < end


# Device Token CRUD
def create_or_update_device_token(db: Session, user_id: int, token: str, device_type: str):
    """Create or update device token"""
    existing = db.query(models.DeviceToken).filter(
        models.DeviceToken.token == token
    ).first()
    
    if existing:
        existing.user_id = user_id
        existing.device_type = device_type
        existing.is_active = True
        existing.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing
    else:
        device_token = models.DeviceToken(
            user_id=user_id,
            token=token,
            device_type=device_type
        )
        db.add(device_token)
        db.commit()
        db.refresh(device_token)
        return device_token


def get_user_device_tokens(db: Session, user_id: int):
    """Get all active device tokens for a user"""
    return db.query(models.DeviceToken).filter(
        models.DeviceToken.user_id == user_id,
        models.DeviceToken.is_active == True
    ).all()


def delete_device_token(db: Session, user_id: int, token: str):
    """Delete device token"""
    device_token = db.query(models.DeviceToken).filter(
        models.DeviceToken.user_id == user_id,
        models.DeviceToken.token == token
    ).first()
    
    if device_token:
        db.delete(device_token)
        db.commit()
        return True
    return False


# Notification CRUD
def create_notification(
    db: Session,
    user_id: int,
    title: str,
    body: str,
    notification_type: str,
    related_report_id: Optional[int] = None,
    related_coupon_id: Optional[int] = None,
    title_en: Optional[str] = None,
    body_en: Optional[str] = None
):
    """Create a new notification"""
    notification = models.Notification(
        user_id=user_id,
        title=title,
        body=body,
        title_en=title_en,
        body_en=body_en,
        type=notification_type,
        related_report_id=related_report_id,
        related_coupon_id=related_coupon_id
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def get_user_notifications(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 100,
    unread_only: bool = False
):
    """Get user's notifications"""
    query = db.query(models.Notification).filter(
        models.Notification.user_id == user_id
    )
    
    if unread_only:
        query = query.filter(models.Notification.is_read == False)
    
    return query.order_by(
        models.Notification.created_at.desc()
    ).offset(skip).limit(limit).all()


def mark_notification_read(db: Session, notification_id: int, user_id: int):
    """Mark a notification as read"""
    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == user_id
    ).first()
    
    if notification:
        notification.is_read = True
        notification.read_at = datetime.utcnow()
        db.commit()
        db.refresh(notification)
    
    return notification


def mark_all_notifications_read(db: Session, user_id: int):
    """Mark all notifications as read for a user"""
    count = db.query(models.Notification).filter(
        models.Notification.user_id == user_id,
        models.Notification.is_read == False
    ).update({
        "is_read": True,
        "read_at": datetime.utcnow()
    })
    db.commit()
    return count


def get_unread_count(db: Session, user_id: int):
    """Get count of unread notifications"""
    return db.query(models.Notification).filter(
        models.Notification.user_id == user_id,
        models.Notification.is_read == False
    ).count()
