import json
import logging
import os
from datetime import datetime

import pika

logger = logging.getLogger(__name__)

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")


def publish_event(event_type: str, data: dict):
    """Publish an event to RabbitMQ"""
    try:
        parameters = pika.URLParameters(RABBITMQ_URL)
        connection = pika.BlockingConnection(parameters)
        channel = connection.channel()
        
        channel.exchange_declare(
            exchange='kashif_events',
            exchange_type='topic',
            durable=True
        )
        
        message = {
            "event_type": event_type,
            "data": data,
            "timestamp": str(datetime.utcnow())
        }
        
        channel.basic_publish(
            exchange='kashif_events',
            routing_key=event_type,
            body=json.dumps(message),
            properties=pika.BasicProperties(
                delivery_mode=2,
                content_type='application/json'
            )
        )
        
        logger.info(f"Published event {event_type} to RabbitMQ")
        connection.close()
        
    except Exception as e:
        logger.error(f"Failed to publish event to RabbitMQ: {e}")
        raise
        raise
