import logging
import threading
from typing import Annotated, List, Optional

import auth_client
import crud
import fcm_service
import models
import schemas
from database import engine, get_db
from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from rabbitmq_consumer import start_consumer
from sqlalchemy.orm import Session

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Notification Service")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Start RabbitMQ consumer
consumer_thread = threading.Thread(target=start_consumer, daemon=True)
consumer_thread.start()


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "notification"}


async def get_current_user_id(authorization: Annotated[str, Header()]):
    """Verify token with auth service"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header"
        )
    token = authorization.replace("Bearer ", "")
    user = await auth_client.verify_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    return user["id"]


@app.post("/register-device", response_model=schemas.DeviceToken)
async def register_device(
    device: schemas.DeviceTokenCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Register user's device FCM token"""
    return crud.create_or_update_device_token(
        db=db,
        user_id=user_id,
        token=device.token,
        device_type=device.device_type
    )


@app.delete("/unregister-device/{token}")
async def unregister_device(
    token: str,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Unregister user's device FCM token"""
    success = crud.delete_device_token(db=db, user_id=user_id, token=token)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device token not found"
        )
    return {"message": "Device token unregistered"}


@app.get("/", response_model=List[schemas.Notification])
async def get_notifications(
    skip: int = 0,
    limit: int = 100,
    unread_only: bool = False,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get user's notifications"""
    return crud.get_user_notifications(
        db=db,
        user_id=user_id,
        skip=skip,
        limit=limit,
        unread_only=unread_only
    )


@app.patch("/{notification_id}/read", response_model=schemas.Notification)
async def mark_notification_read(
    notification_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Mark notification as read"""
    notification = crud.mark_notification_read(db=db, notification_id=notification_id, user_id=user_id)
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    return notification


@app.post("/mark-all-read")
async def mark_all_read(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read"""
    count = crud.mark_all_notifications_read(db=db, user_id=user_id)
    return {"message": f"Marked {count} notifications as read"}


@app.get("/unread-count")
async def get_unread_count(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get count of unread notifications"""
    count = crud.get_unread_count(db=db, user_id=user_id)
    return {"unread_count": count}


@app.post("/send", response_model=schemas.Notification)
async def send_notification(
    notification: schemas.NotificationCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Manually send a notification (admin only)"""
    # Create notification in database
    db_notification = crud.create_notification(
        db=db,
        user_id=notification.user_id,
        title=notification.title,
        body=notification.body,
        notification_type=notification.type,
        related_report_id=notification.related_report_id,
        related_coupon_id=notification.related_coupon_id
    )
    
    # Send push notification
    try:
        fcm_service.send_push_notification(
            db=db,
            user_id=notification.user_id,
            title=notification.title,
            body=notification.body,
            data={"notification_id": str(db_notification.id)}
        )
    except Exception as e:
        logger.error(f"Failed to send push notification: {e}")
    
    return db_notification


@app.post("/broadcast")
async def broadcast_notification(
    notification: schemas.BroadcastNotificationCreate,
    authorization: Annotated[str, Header()],
    db: Session = Depends(get_db)
):
    """Broadcast notification to multiple users based on role (admin only)"""
    # Verify token first
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header"
        )
    token = authorization.replace("Bearer ", "")
    current_user = await auth_client.verify_token(token)
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # Only admin can broadcast
    if current_user.get("role", "").upper() != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can broadcast notifications"
        )
    
    # Get users based on role filter
    users = await auth_client.get_users_by_role(token, notification.target_role)
    
    if not users:
        return {
            "message": "No users found matching criteria",
            "sent_count": 0,
            "failed_count": 0
        }
    
    sent_count = 0
    failed_count = 0
    
    for user in users:
        user_id = user.get("id")
        if not user_id:
            continue
            
        try:
            # Create notification in database
            db_notification = crud.create_notification(
                db=db,
                user_id=user_id,
                title=notification.title,
                body=notification.body,
                notification_type=notification.type
            )
            
            # Send push notification
            try:
                fcm_service.send_push_notification(
                    db=db,
                    user_id=user_id,
                    title=notification.title,
                    body=notification.body,
                    data={"notification_id": str(db_notification.id)}
                )
                sent_count += 1
            except Exception as e:
                logger.error(f"Failed to send push to user {user_id}: {e}")
                sent_count += 1  # Notification was created, just push failed
                
        except Exception as e:
            logger.error(f"Failed to create notification for user {user_id}: {e}")
            failed_count += 1
    
    target_desc = notification.target_role if notification.target_role else "ALL"
    return {
        "message": f"Broadcast to {target_desc} users completed",
        "sent_count": sent_count,
        "failed_count": failed_count,
        "total_users": len(users)
    }
