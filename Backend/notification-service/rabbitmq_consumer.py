import json
import logging
import os

import crud
import fcm_service
import pika
from database import SessionLocal

logger = logging.getLogger(__name__)

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")


def handle_user_registered(event_data):
    """Send welcome notification to new user"""
    try:
        db = SessionLocal()
        user_id = event_data.get("user_id")
        
        if user_id:
            crud.create_notification(
                db=db,
                user_id=user_id,
                title="مرحباً بك في Kashif!",
                body="شكراً لتسجيلك. ابدأ بالإبلاغ عن المشاكل واكسب النقاط!",
                notification_type="WELCOME"
            )
            logger.info(f"Created welcome notification for user {user_id}")
        
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
            
            # Send push notification
            fcm_service.send_push_notification(
                db=db,
                user_id=user_id,
                title="تم استلام بلاغك",
                body=f"شكراً لك! تم استلام بلاغك #{report_id}",
                data={"notification_id": str(notification.id), "report_id": str(report_id)}
            )
        
        db.close()
    except Exception as e:
        logger.error(f"Error handling report_created event: {e}")


def handle_report_status_updated(event_data):
    """Notify user about report status change"""
    try:
        db = SessionLocal()
        report_id = event_data.get("report_id")
        new_status = event_data.get("new_status")
        # Need to get user_id from report (would call reporting service)
        
        logger.info(f"Report {report_id} status updated to {new_status}")
        # TODO: Implement actual notification
        
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
            
            # Send push notification
            fcm_service.send_push_notification(
                db=db,
                user_id=user_id,
                title=f"حصلت على {points} نقطة!",
                body=description or f"تم إضافة {points} نقطة",
                data={"notification_id": str(notification.id)}
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
            
            # Send push notification
            fcm_service.send_push_notification(
                db=db,
                user_id=user_id,
                title="تم استبدال القسيمة!",
                body="يمكنك استخدام قسيمتك الآن",
                data={"notification_id": str(notification.id), "coupon_id": str(coupon_id)}
            )
        
        db.close()
    except Exception as e:
        logger.error(f"Error handling coupon_redeemed event: {e}")


def start_consumer():
    """Start consuming events from RabbitMQ"""
    try:
        parameters = pika.URLParameters(RABBITMQ_URL)
        connection = pika.BlockingConnection(parameters)
        channel = connection.channel()
        
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
        
    except Exception as e:
        logger.error(f"Failed to start RabbitMQ consumer: {e}")
        logger.error(f"Failed to start RabbitMQ consumer: {e}")
