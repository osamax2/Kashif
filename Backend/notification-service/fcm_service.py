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

if FIREBASE_CREDENTIALS_PATH and os.path.exists(FIREBASE_CREDENTIALS_PATH):
    try:
        cred = credentials.Certificate(FIREBASE_CREDENTIALS_PATH)
        firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin SDK initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Firebase Admin SDK: {e}")
else:
    logger.warning("Firebase credentials not found. Push notifications will not work.")


def send_push_notification(
    db: Session,
    user_id: int,
    title: str,
    body: str,
    data: dict = None
):
    """Send push notification to user's devices"""
    try:
        # Get user's device tokens
        device_tokens = crud.get_user_device_tokens(db, user_id)
        
        if not device_tokens:
            logger.info(f"No device tokens found for user {user_id}")
            return
        
        tokens = [dt.token for dt in device_tokens]
        
        # Create message
        message = messaging.MulticastMessage(
            notification=messaging.Notification(
                title=title,
                body=body
            ),
            data=data or {},
            tokens=tokens
        )
        
        # Send message
        response = messaging.send_multicast(message)
        
        logger.info(
            f"Push notification sent to user {user_id}: "
            f"{response.success_count} successful, {response.failure_count} failed"
        )
        
        # Handle failures (invalid tokens)
        if response.failure_count > 0:
            failed_tokens = []
            for idx, resp in enumerate(response.responses):
                if not resp.success:
                    failed_tokens.append(tokens[idx])
                    logger.warning(f"Failed to send to token {tokens[idx]}: {resp.exception}")
            
            # Remove invalid tokens
            # TODO: Implement token cleanup
        
        return response
        
    except Exception as e:
        logger.error(f"Failed to send push notification: {e}")
        return None
        return None
