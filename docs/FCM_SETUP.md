# Firebase Cloud Messaging (FCM) Integration

## Frontend Setup

### 1. Install Dependencies
```bash
npm install expo-notifications expo-device
```

### 2. Configure app.json
The `expo-notifications` plugin is already configured in `app.json`.

### 3. Get Expo Project ID
1. Run `expo start` and note the project ID in the terminal
2. Update `services/notifications.ts` line 36 with your project ID:
   ```typescript
   projectId: 'your-expo-project-id', // Replace with your actual project ID
   ```

### 4. Test Notifications
- Push notifications only work on physical devices (not simulators)
- When user logs in, device token is automatically registered with backend
- When user logs out, device token is unregistered

## Backend Setup (On Production Server)

### 1. Install Firebase Admin SDK
```bash
cd /root/Kashif_backend/Kashif/Backend/notification-service
pip install firebase-admin
```

### 2. Create Firebase Service Account
1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project (or create new one)
3. Go to Project Settings → Service Accounts
4. Click "Generate New Private Key"
5. Download the JSON file

### 3. Upload Service Account to Server
```bash
# On your local machine:
scp path/to/firebase-service-account.json root@38.127.216.236:/root/Kashif_backend/Kashif/Backend/notification-service/firebase-credentials.json
```

### 4. Update notification-service Environment
Add Firebase configuration to `.env` or `docker-compose.yml`:

```bash
# In notification-service/.env or environment variables:
FIREBASE_CREDENTIALS_PATH=/app/firebase-credentials.json
```

### 5. Update fcm_service.py
The FCM service needs to use Firebase Admin SDK instead of the legacy server key.

Create `/root/Kashif_backend/Kashif/Backend/notification-service/fcm_service.py`:

```python
import firebase_admin
from firebase_admin import credentials, messaging
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)

class FCMService:
    def __init__(self, credentials_path: str = "firebase-credentials.json"):
        """Initialize Firebase Admin SDK"""
        try:
            if not firebase_admin._apps:
                cred = credentials.Certificate(credentials_path)
                firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin SDK initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Firebase Admin SDK: {e}")
            raise

    async def send_notification(
        self,
        device_token: str,
        title: str,
        body: str,
        data: Optional[Dict] = None
    ) -> bool:
        """
        Send push notification via FCM using Firebase Admin SDK
        
        Args:
            device_token: FCM device token
            title: Notification title
            body: Notification body
            data: Additional data payload
        
        Returns:
            True if successful, False otherwise
        """
        try:
            # Build notification message
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                ),
                data=data or {},
                token=device_token,
                android=messaging.AndroidConfig(
                    priority='high',
                    notification=messaging.AndroidNotification(
                        sound='default',
                        color='#F4B400',
                        channel_id='default',
                    ),
                ),
                apns=messaging.APNSConfig(
                    payload=messaging.APNSPayload(
                        aps=messaging.Aps(
                            sound='default',
                            badge=1,
                        ),
                    ),
                ),
            )

            # Send message
            response = messaging.send(message)
            logger.info(f"Successfully sent notification: {response}")
            return True

        except messaging.UnregisteredError:
            logger.warning(f"Device token is invalid or unregistered: {device_token}")
            return False
        except Exception as e:
            logger.error(f"Failed to send notification: {e}")
            return False

    async def send_batch_notifications(
        self,
        device_tokens: list[str],
        title: str,
        body: str,
        data: Optional[Dict] = None
    ) -> Dict[str, int]:
        """
        Send push notifications to multiple devices
        
        Returns:
            Dict with 'success_count' and 'failure_count'
        """
        try:
            messages = [
                messaging.Message(
                    notification=messaging.Notification(title=title, body=body),
                    data=data or {},
                    token=token,
                )
                for token in device_tokens
            ]

            # Send batch
            response = messaging.send_all(messages)
            
            logger.info(
                f"Batch notification sent: {response.success_count} success, "
                f"{response.failure_count} failures"
            )
            
            return {
                'success_count': response.success_count,
                'failure_count': response.failure_count,
            }

        except Exception as e:
            logger.error(f"Failed to send batch notifications: {e}")
            return {'success_count': 0, 'failure_count': len(device_tokens)}


# Singleton instance
fcm_service = FCMService()
```

### 6. Update RabbitMQ Consumer for Notifications

Update `/root/Kashif_backend/Kashif/Backend/notification-service/rabbitmq_consumer.py`:

```python
import pika
import json
import logging
from database import get_db
from crud import create_notification, get_user_device_tokens
from fcm_service import fcm_service

logger = logging.getLogger(__name__)

def start_consumer():
    """Start RabbitMQ consumer for notification events"""
    try:
        connection = pika.BlockingConnection(
            pika.ConnectionParameters(host='rabbitmq', heartbeat=600)
        )
        channel = connection.channel()

        # Declare exchanges and queues
        channel.exchange_declare(exchange='report_events', exchange_type='topic', durable=True)
        channel.exchange_declare(exchange='gamification_events', exchange_type='topic', durable=True)
        
        channel.queue_declare(queue='notification_queue', durable=True)
        
        # Bind to report events
        channel.queue_bind(
            exchange='report_events',
            queue='notification_queue',
            routing_key='report.status_updated'
        )
        
        # Bind to gamification events
        channel.queue_bind(
            exchange='gamification_events',
            queue='notification_queue',
            routing_key='points.transaction.created'
        )

        def callback(ch, method, properties, body):
            try:
                event_data = json.loads(body)
                logger.info(f"Received event: {method.routing_key} - {event_data}")

                if method.routing_key == 'report.status_updated':
                    handle_report_status_update(event_data)
                elif method.routing_key == 'points.transaction.created':
                    handle_points_earned(event_data)

                ch.basic_ack(delivery_tag=method.delivery_tag)
            except Exception as e:
                logger.error(f"Error processing message: {e}")
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

        channel.basic_qos(prefetch_count=1)
        channel.basic_consume(queue='notification_queue', on_message_callback=callback)

        logger.info('Notification consumer started, waiting for messages...')
        channel.start_consuming()

    except Exception as e:
        logger.error(f"Failed to start consumer: {e}")


def handle_report_status_update(event_data: dict):
    """Handle report status update event"""
    try:
        db = next(get_db())
        
        report_id = event_data.get('report_id')
        user_id = event_data.get('user_id')
        new_status = event_data.get('new_status')
        
        # Status messages in Arabic
        status_messages = {
            'pending': 'بلاغك قيد المراجعة',
            'in_progress': 'جاري العمل على بلاغك',
            'resolved': 'تم حل بلاغك بنجاح',
            'rejected': 'تم رفض بلاغك',
        }
        
        title = "تحديث حالة البلاغ"
        body = status_messages.get(new_status, f"تم تحديث حالة البلاغ إلى {new_status}")
        
        # Create notification in database
        notification = create_notification(
            db=db,
            user_id=user_id,
            title=title,
            body=body,
            notification_type=f"report_{new_status}",
            related_report_id=report_id,
        )
        
        # Send push notification
        device_tokens = get_user_device_tokens(db, user_id)
        for token in device_tokens:
            fcm_service.send_notification(
                device_token=token.token,
                title=title,
                body=body,
                data={
                    'notification_id': str(notification.id),
                    'related_report_id': str(report_id),
                    'type': f'report_{new_status}',
                }
            )
        
        logger.info(f"Notification sent for report {report_id} status update")
        
    except Exception as e:
        logger.error(f"Failed to handle report status update: {e}")


def handle_points_earned(event_data: dict):
    """Handle points earned event"""
    try:
        db = next(get_db())
        
        user_id = event_data.get('user_id')
        points = event_data.get('points')
        transaction_type = event_data.get('transaction_type', 'earned')
        
        title = "🏅 نقاط جديدة"
        body = f"حصلت على +{points} نقطة جديدة!"
        
        # Create notification in database
        notification = create_notification(
            db=db,
            user_id=user_id,
            title=title,
            body=body,
            notification_type='points_earned',
        )
        
        # Send push notification
        device_tokens = get_user_device_tokens(db, user_id)
        for token in device_tokens:
            fcm_service.send_notification(
                device_token=token.token,
                title=title,
                body=body,
                data={
                    'notification_id': str(notification.id),
                    'points': str(points),
                    'type': 'points_earned',
                }
            )
        
        logger.info(f"Notification sent for user {user_id} earning {points} points")
        
    except Exception as e:
        logger.error(f"Failed to handle points earned: {e}")
```

### 7. Update Docker Compose
Add volume mount for Firebase credentials:

```yaml
notification-service:
  volumes:
    - ./notification-service:/app
    - ./notification-service/firebase-credentials.json:/app/firebase-credentials.json:ro
```

### 8. Restart notification-service
```bash
cd /root/Kashif_backend/Kashif/Backend
docker-compose restart notification-service
docker-compose logs -f notification-service
```

## Testing

### Test Device Registration
1. Login to the app on a physical device
2. Check logs to verify device token is registered:
   ```bash
   docker-compose logs -f notification-service | grep "Device token registered"
   ```

### Test Notification Sending
1. Create a new report
2. Watch for notification:
   ```bash
   docker-compose logs -f notification-service
   ```

### Test Manual Notification
```bash
curl -X POST http://38.127.216.236:8000/api/notification/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Notification",
    "body": "This is a test notification",
    "user_ids": [1]
  }'
```

## Troubleshooting

### Notifications not received
1. Check device token is registered:
   ```sql
   SELECT * FROM device_tokens WHERE user_id = YOUR_USER_ID;
   ```
2. Check Firebase credentials are valid
3. Check RabbitMQ consumer is running:
   ```bash
   docker-compose logs notification-service | grep "consumer started"
   ```
4. Verify notification permissions on device

### Invalid device token
- Token expires when app is uninstalled
- Token changes when app is reinstalled
- Frontend automatically re-registers on login

## Event Types

The system sends notifications for these events:

- **report_pending**: Report submitted and pending review
- **report_in_progress**: Work started on report
- **report_resolved**: Report has been resolved
- **report_rejected**: Report was rejected
- **points_earned**: User earned points
- **achievement**: User unlocked achievement

## Notes

- Firebase Cloud Messaging API V1 is used (not legacy)
- Notifications work on both iOS and Android
- Device tokens are stored in `device_tokens` table
- Notifications are stored in `notifications` table
- Push notifications are sent via FCM
- In-app notifications are fetched from backend API
