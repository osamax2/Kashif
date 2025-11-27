import json
import logging
import os

import pika

logger = logging.getLogger(__name__)

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")


def publish_event(event_type: str, data: dict):
    """
    Publish an event to RabbitMQ
    event_type: e.g., "user.registered", "user.updated"
    data: dict with event payload
    """
    try:
        # Connect to RabbitMQ
        parameters = pika.URLParameters(RABBITMQ_URL)
        connection = pika.BlockingConnection(parameters)
        channel = connection.channel()
        
        # Declare exchange
        channel.exchange_declare(
            exchange='kashif_events',
            exchange_type='topic',
            durable=True
        )
        
        # Prepare message
        message = {
            "event_type": event_type,
            "data": data,
            "timestamp": str(datetime.utcnow())
        }
        
        # Publish message
        channel.basic_publish(
            exchange='kashif_events',
            routing_key=event_type,
            body=json.dumps(message),
            properties=pika.BasicProperties(
                delivery_mode=2,  # Make message persistent
                content_type='application/json'
            )
        )
        
        logger.info(f"Published event {event_type} to RabbitMQ")
        connection.close()
        
    except Exception as e:
        logger.error(f"Failed to publish event to RabbitMQ: {e}")
        raise


from datetime import datetime
from datetime import datetime
