import json
import logging
import os

import crud
import pika
from database import SessionLocal

logger = logging.getLogger(__name__)

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")

# Points awarded for different actions
POINTS_CONFIG = {
    "report_created": 10,
    "report_resolved": 5
}


def handle_report_created(event_data):
    """Award points when user creates a report"""
    try:
        db = SessionLocal()
        
        user_id = event_data.get("user_id")
        report_id = event_data.get("report_id")
        
        if user_id and report_id:
            points = POINTS_CONFIG["report_created"]
            transaction = crud.create_transaction(
                db=db,
                user_id=user_id,
                points=points,
                transaction_type="REPORT_CREATED",
                report_id=report_id,
                description=f"Created report #{report_id}"
            )
            logger.info(f"Awarded {points} points to user {user_id} for creating report {report_id}")
            
            # Publish event to update user's total_points in auth service
            from rabbitmq_publisher import publish_event
            try:
                publish_event("points.transaction.created", {
                    "user_id": user_id,
                    "points": points,
                    "transaction_id": transaction.id,
                    "transaction_type": "REPORT_CREATED"
                })
                logger.info(f"Published points.transaction.created event for user {user_id}")
            except Exception as e:
                logger.error(f"Failed to publish points transaction event: {e}")
        
        db.close()
        
    except Exception as e:
        logger.error(f"Error handling report_created event: {e}")


def handle_report_resolved(event_data):
    """Award bonus points when user's report is resolved"""
    try:
        db = SessionLocal()
        
        # Get user_id from report (would need to call reporting service or store it)
        report_id = event_data.get("report_id")
        user_id = event_data.get("user_id")  # Assuming this is included
        
        if user_id and report_id:
            points = POINTS_CONFIG["report_resolved"]
            transaction = crud.create_transaction(
                db=db,
                user_id=user_id,
                points=points,
                transaction_type="CONFIRMATION",
                report_id=report_id,
                description=f"Report #{report_id} was resolved"
            )
            logger.info(f"Awarded {points} points to user {user_id} for resolved report {report_id}")
            
            # Publish event to update user's total_points in auth service
            from rabbitmq_publisher import publish_event
            try:
                publish_event("points.transaction.created", {
                    "user_id": user_id,
                    "points": points,
                    "transaction_id": transaction.id,
                    "transaction_type": "CONFIRMATION"
                })
                logger.info(f"Published points.transaction.created event for user {user_id}")
            except Exception as e:
                logger.error(f"Failed to publish points transaction event: {e}")
        
        db.close()
        
    except Exception as e:
        logger.error(f"Error handling report_resolved event: {e}")


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
        
        result = channel.queue_declare(queue='gamification_service_queue', durable=True)
        queue_name = result.method.queue
        
        # Bind to relevant events
        channel.queue_bind(
            exchange='kashif_events',
            queue=queue_name,
            routing_key='report.created'
        )
        channel.queue_bind(
            exchange='kashif_events',
            queue=queue_name,
            routing_key='report.status_updated'
        )
        
        def callback(ch, method, properties, body):
            try:
                message = json.loads(body)
                event_type = message.get('event_type')
                data = message.get('data')
                
                logger.info(f"Received event: {event_type}")
                
                if event_type == 'report.created':
                    handle_report_created(data)
                elif event_type == 'report.status_updated':
                    if data.get('new_status') == 'resolved':
                        handle_report_resolved(data)
                
                ch.basic_ack(delivery_tag=method.delivery_tag)
                
            except Exception as e:
                logger.error(f"Error processing message: {e}")
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        
        channel.basic_consume(queue=queue_name, on_message_callback=callback)
        
        logger.info("Gamification service started consuming events from RabbitMQ")
        channel.start_consuming()
        
    except Exception as e:
        logger.error(f"Failed to start RabbitMQ consumer: {e}")
        logger.error(f"Failed to start RabbitMQ consumer: {e}")
