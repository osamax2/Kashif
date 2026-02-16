import json
import logging
import os
import time

import crud
import email_service
import fcm_service
import pika
from database import SessionLocal

logger = logging.getLogger(__name__)

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")
RECONNECT_DELAY = 5  # seconds between reconnection attempts
MAX_RECONNECT_DELAY = 60  # maximum delay between attempts


def handle_user_registered(event_data):
    """Send welcome notification and verification email to new user"""
    try:
        db = SessionLocal()
        user_id = event_data.get("user_id")
        email = event_data.get("email")
        full_name = event_data.get("full_name", "User")
        verification_token = event_data.get("verification_token")
        language = event_data.get("language", "ar")
        
        if user_id:
            crud.create_notification(
                db=db,
                user_id=user_id,
                title="مرحباً بك في Kashif!",
                body="شكراً لتسجيلك. ابدأ بالإبلاغ عن المشاكل واكسب النقاط!",
                notification_type="WELCOME"
            )
            logger.info(f"Created welcome notification for user {user_id}")
        
        # Send verification email if token is provided
        if email and verification_token:
            success = email_service.send_verification_email(
                to_email=email,
                full_name=full_name,
                verification_token=verification_token,
                language=language
            )
            if success:
                logger.info(f"Verification email sent to {email}")
            else:
                logger.error(f"Failed to send verification email to {email}")
        
        db.close()
    except Exception as e:
        logger.error(f"Error handling user_registered event: {e}")


def handle_report_created(event_data):
    """Notify user that report was created successfully"""
    try:
        db = SessionLocal()
        user_id = event_data.get("user_id")
        report_id = event_data.get("report_id")
        
        if user_id and report_id:
            notification = crud.create_notification(
                db=db,
                user_id=user_id,
                title="تم استلام بلاغك",
                body=f"شكراً لك! تم استلام بلاغك #{report_id} وسيتم مراجعته قريباً.",
                notification_type="REPORT_UPDATE",
                related_report_id=report_id
            )
            
            # Send push notification (respects preferences)
            fcm_service.send_push_notification(
                db=db,
                user_id=user_id,
                title="تم استلام بلاغك",
                body=f"شكراً لك! تم استلام بلاغك #{report_id}",
                data={"notification_id": str(notification.id), "report_id": str(report_id)},
                notification_type="REPORT_CREATED"
            )
        
        db.close()
    except Exception as e:
        logger.error(f"Error handling report_created event: {e}")


def handle_report_status_updated(event_data):
    """Notify user about report status change"""
    try:
        db = SessionLocal()
        report_id = event_data.get("report_id")
        user_id = event_data.get("user_id")
        new_status_id = event_data.get("new_status_id")
        
        if not user_id or not report_id:
            logger.warning(f"Missing user_id or report_id in report.status_updated event")
            db.close()
            return

        # Map status IDs to human readable names (ar/en)
        status_names = {
            1: {"ar": "مفتوح", "en": "Open"},
            2: {"ar": "قيد المراجعة", "en": "Under Review"},
            3: {"ar": "قيد المعالجة", "en": "In Progress"},
            4: {"ar": "تم الإصلاح", "en": "Resolved"},
            5: {"ar": "مرفوض", "en": "Rejected"},
        }
        
        status_info = status_names.get(new_status_id, {"ar": f"حالة {new_status_id}", "en": f"Status {new_status_id}"})
        
        # Create notification with bilingual content
        title_ar = f"تحديث بلاغك #{report_id}"
        body_ar = f"تم تغيير حالة بلاغك إلى: {status_info['ar']}"
        title_en = f"Report #{report_id} Updated"
        body_en = f"Your report status changed to: {status_info['en']}"
        
        notification = crud.create_notification(
            db=db,
            user_id=user_id,
            title=title_ar,
            body=body_ar,
            notification_type="REPORT_UPDATE",
            related_report_id=report_id,
            title_en=title_en,
            body_en=body_en
        )
        
        # Send push notification (respects preferences)
        fcm_service.send_push_notification(
            db=db,
            user_id=user_id,
            title=title_ar,
            body=body_ar,
            data={
                "notification_id": str(notification.id),
                "report_id": str(report_id),
                "new_status_id": str(new_status_id),
                "title_en": title_en,
                "body_en": body_en,
                "type": "report_status_updated"
            },
            notification_type="REPORT_UPDATE"
        )
        
        logger.info(f"Report {report_id} status update notification sent to user {user_id} (status: {status_info['en']})")
        
        db.close()
    except Exception as e:
        logger.error(f"Error handling report_status_updated event: {e}")


def handle_points_awarded(event_data):
    """Notify user about points awarded"""
    try:
        db = SessionLocal()
        user_id = event_data.get("user_id")
        points = event_data.get("points")
        description = event_data.get("description", "")
        
        if user_id and points:
            notification = crud.create_notification(
                db=db,
                user_id=user_id,
                title=f"حصلت على {points} نقطة!",
                body=description or f"تم إضافة {points} نقطة إلى رصيدك",
                notification_type="POINTS_AWARDED"
            )
            
            # Send push notification (respects preferences)
            fcm_service.send_push_notification(
                db=db,
                user_id=user_id,
                title=f"حصلت على {points} نقطة!",
                body=description or f"تم إضافة {points} نقطة",
                data={"notification_id": str(notification.id)},
                notification_type="POINTS_AWARDED"
            )
        
        db.close()
    except Exception as e:
        logger.error(f"Error handling points_awarded event: {e}")


def handle_coupon_redeemed(event_data):
    """Notify user about coupon redemption"""
    try:
        db = SessionLocal()
        user_id = event_data.get("user_id")
        redemption_id = event_data.get("redemption_id")
        coupon_id = event_data.get("coupon_id")
        
        if user_id:
            notification = crud.create_notification(
                db=db,
                user_id=user_id,
                title="تم استبدال القسيمة!",
                body="تم استبدال القسيمة بنجاح. يمكنك استخدامها الآن.",
                notification_type="COUPON_REDEEMED",
                related_coupon_id=coupon_id
            )
            
            # Send push notification (respects preferences)
            fcm_service.send_push_notification(
                db=db,
                user_id=user_id,
                title="تم استبدال القسيمة!",
                body="يمكنك استخدام قسيمتك الآن",
                data={"notification_id": str(notification.id), "coupon_id": str(coupon_id)},
                notification_type="COUPON_REDEEMED"
            )
        
        db.close()
    except Exception as e:
        logger.error(f"Error handling coupon_redeemed event: {e}")


def handle_verification_resend(event_data):
    """Resend verification email"""
    try:
        email = event_data.get("email")
        full_name = event_data.get("full_name", "User")
        verification_token = event_data.get("verification_token")
        language = event_data.get("language", "ar")
        
        if email and verification_token:
            success = email_service.send_verification_email(
                to_email=email,
                full_name=full_name,
                verification_token=verification_token,
                language=language
            )
            if success:
                logger.info(f"Verification email resent to {email}")
            else:
                logger.error(f"Failed to resend verification email to {email}")
    except Exception as e:
        logger.error(f"Error handling verification_resend event: {e}")


def handle_password_reset(event_data):
    """Send password reset email"""
    try:
        email = event_data.get("email")
        full_name = event_data.get("full_name", "User")
        reset_token = event_data.get("reset_token")
        language = event_data.get("language", "ar")
        
        if email and reset_token:
            success = email_service.send_password_reset_email(
                to_email=email,
                full_name=full_name,
                reset_token=reset_token,
                language=language
            )
            if success:
                logger.info(f"Password reset email sent to {email}")
            else:
                logger.error(f"Failed to send password reset email to {email}")
    except Exception as e:
        logger.error(f"Error handling password_reset event: {e}")


def handle_verification_code(event_data):
    """Send verification code email"""
    try:
        email = event_data.get("email")
        full_name = event_data.get("full_name", "User")
        verification_code = event_data.get("verification_code")
        language = event_data.get("language", "ar")
        
        if email and verification_code:
            success = email_service.send_verification_code_email(
                to_email=email,
                full_name=full_name,
                verification_code=verification_code,
                language=language
            )
            if success:
                logger.info(f"Verification code email sent to {email}")
            else:
                logger.error(f"Failed to send verification code email to {email}")
    except Exception as e:
        logger.error(f"Error handling verification_code event: {e}")


def start_consumer():
    """Start consuming events from RabbitMQ with auto-reconnect"""
    retry_delay = RECONNECT_DELAY
    
    while True:
        try:
            parameters = pika.URLParameters(RABBITMQ_URL)
            parameters.heartbeat = 600  # 10 minutes heartbeat
            parameters.blocked_connection_timeout = 300  # 5 minutes blocked timeout
            connection = pika.BlockingConnection(parameters)
            channel = connection.channel()
            
            # Reset retry delay on successful connection
            retry_delay = RECONNECT_DELAY
            
            channel.exchange_declare(
                exchange='kashif_events',
                exchange_type='topic',
                durable=True
            )
            
            result = channel.queue_declare(queue='notification_service_queue', durable=True)
            queue_name = result.method.queue
            
            # Bind to all relevant events
            events = [
                'user.registered',
                'user.verification_resend',
                'user.password_reset',
                'user.verification_code',
                'report.created',
                'report.status_updated',
                'points.awarded',
                'coupon.redeemed'
            ]
            
            for event in events:
                channel.queue_bind(
                    exchange='kashif_events',
                    queue=queue_name,
                    routing_key=event
                )
            
            def callback(ch, method, properties, body):
                try:
                    message = json.loads(body)
                    event_type = message.get('event_type')
                    data = message.get('data')
                    
                    logger.info(f"Received event: {event_type}")
                    
                    if event_type == 'user.registered':
                        handle_user_registered(data)
                    elif event_type == 'user.verification_resend':
                        handle_verification_resend(data)
                    elif event_type == 'user.password_reset':
                        handle_password_reset(data)
                    elif event_type == 'user.verification_code':
                        handle_verification_code(data)
                    elif event_type == 'report.created':
                        handle_report_created(data)
                    elif event_type == 'report.status_updated':
                        handle_report_status_updated(data)
                    elif event_type == 'points.awarded':
                        handle_points_awarded(data)
                    elif event_type == 'coupon.redeemed':
                        handle_coupon_redeemed(data)
                    
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                    
                except Exception as e:
                    logger.error(f"Error processing message: {e}")
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            
            channel.basic_consume(queue=queue_name, on_message_callback=callback)
            
            logger.info("Notification service started consuming events from RabbitMQ")
            channel.start_consuming()
            
        except KeyboardInterrupt:
            logger.info("Consumer stopped by user")
            try:
                connection.close()
            except Exception:
                pass
            break
            
        except Exception as e:
            logger.error(f"RabbitMQ consumer connection lost: {e}")
            logger.info(f"Reconnecting in {retry_delay} seconds...")
            time.sleep(retry_delay)
            # Exponential backoff up to MAX_RECONNECT_DELAY
            retry_delay = min(retry_delay * 2, MAX_RECONNECT_DELAY)
