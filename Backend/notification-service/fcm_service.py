import logging
import os

import crud
import firebase_admin
from firebase_admin import credentials, messaging
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK
# In production, load from environment variable or secret
FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH")

logger.info(f"Firebase credentials path: {FIREBASE_CREDENTIALS_PATH}")
logger.info(f"File exists: {os.path.exists(FIREBASE_CREDENTIALS_PATH) if FIREBASE_CREDENTIALS_PATH else False}")

if FIREBASE_CREDENTIALS_PATH and os.path.exists(FIREBASE_CREDENTIALS_PATH):
    try:
        cred = credentials.Certificate(FIREBASE_CREDENTIALS_PATH)
        firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin SDK initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Firebase Admin SDK: {e}", exc_info=True)
else:
    logger.warning("Firebase credentials not found. Push notifications will not work.")


def send_push_notification(
    db: Session,
    user_id: int,
    title: str,
    body: str,
    data: dict = None,
    notification_type: str = None
):
    """Send push notification to user's devices (respects preferences)"""
    try:
        # Check notification preferences
        if notification_type:
            if not crud.is_notification_enabled(db, user_id, notification_type):
                logger.info(f"Notification type '{notification_type}' disabled for user {user_id}, skipping push")
                return {"success_count": 0, "failure_count": 0, "skipped": "disabled"}
        
        # Check quiet hours
        if crud.is_in_quiet_hours(db, user_id):
            logger.info(f"User {user_id} is in quiet hours, skipping push")
            return {"success_count": 0, "failure_count": 0, "skipped": "quiet_hours"}

        # Get user's device tokens
        device_tokens = crud.get_user_device_tokens(db, user_id)
        
        if not device_tokens:
            logger.info(f"No device tokens found for user {user_id}")
            return
        
        tokens = [dt.token for dt in device_tokens]
        logger.info(f"Sending push notification to user {user_id} with {len(tokens)} tokens")
        
        # Send to each token individually using HTTP v1 API
        success_count = 0
        failure_count = 0
        
        for token in tokens:
            try:
                # Create message for single token
                message = messaging.Message(
                    notification=messaging.Notification(
                        title=title,
                        body=body
                    ),
                    data=data or {},
                    token=token
                )
                
                # Send message using HTTP v1 API
                message_id = messaging.send(message)
                logger.info(f"Successfully sent notification to user {user_id}, message_id: {message_id}")
                success_count += 1
                
            except Exception as token_error:
                logger.error(f"Failed to send to token {token[:20]}...: {token_error}")
                failure_count += 1
        
        logger.info(
            f"Push notification sent to user {user_id}: "
            f"{success_count} successful, {failure_count} failed"
        )
        
        return {"success_count": success_count, "failure_count": failure_count}
        
    except Exception as e:
        logger.error(f"Failed to send push notification: {e}", exc_info=True)
        return None
