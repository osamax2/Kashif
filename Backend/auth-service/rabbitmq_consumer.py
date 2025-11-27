import json
import logging
import os

import crud
import pika
from database import SessionLocal

logger = logging.getLogger(__name__)

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")


def handle_point_transaction(event_data):
    """Update user's total_points when a point transaction is created"""
    try:
        db = SessionLocal()
        
        user_id = event_data.get("user_id")
        points = event_data.get("points")
        
        if user_id is not None and points is not None:
            # Update user's total_points
            crud.update_user_total_points(db, user_id, points)
            logger.info(f"Updated total_points for user {user_id}: added {points} points")
        
        db.close()
        
    except Exception as e:
        logger.error(f"Error handling point_transaction event: {e}")


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
        
        result = channel.queue_declare(queue='auth_service_queue', durable=True)
        queue_name = result.method.queue
        
        # Bind to point transaction events
        channel.queue_bind(
            exchange='kashif_events',
            queue=queue_name,
            routing_key='points.transaction.created'
        )
        
        def callback(ch, method, properties, body):
            try:
                message = json.loads(body)
                event_type = message.get('event_type')
                data = message.get('data')
                
                logger.info(f"Received event: {event_type}")
                
                if event_type == 'points.transaction.created':
                    handle_point_transaction(data)
                
                ch.basic_ack(delivery_tag=method.delivery_tag)
                
            except Exception as e:
                logger.error(f"Error processing message: {e}")
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        
        channel.basic_consume(queue=queue_name, on_message_callback=callback)
        
        logger.info("Auth service started consuming events from RabbitMQ")
        channel.start_consuming()
        
    except Exception as e:
        logger.error(f"Failed to start RabbitMQ consumer: {e}")
