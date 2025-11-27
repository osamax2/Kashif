import pika
import json
import os
import logging

logger = logging.getLogger(__name__)

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")


def handle_user_registered(event_data):
    """Handle user.registered event"""
    logger.info(f"User registered event received: {event_data}")
    # Could store user info locally if needed for reports


def start_consumer():
    """Start consuming events from RabbitMQ"""
    try:
        parameters = pika.URLParameters(RABBITMQ_URL)
        connection = pika.BlockingConnection(parameters)
        channel = connection.channel()
        
        # Declare exchange
        channel.exchange_declare(
            exchange='kashif_events',
            exchange_type='topic',
            durable=True
        )
        
        # Declare queue
        result = channel.queue_declare(queue='reporting_service_queue', durable=True)
        queue_name = result.method.queue
        
        # Bind to relevant events
        channel.queue_bind(
            exchange='kashif_events',
            queue=queue_name,
            routing_key='user.registered'
        )
        
        def callback(ch, method, properties, body):
            try:
                message = json.loads(body)
                event_type = message.get('event_type')
                data = message.get('data')
                
                logger.info(f"Received event: {event_type}")
                
                if event_type == 'user.registered':
                    handle_user_registered(data)
                
                ch.basic_ack(delivery_tag=method.delivery_tag)
                
            except Exception as e:
                logger.error(f"Error processing message: {e}")
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        
        channel.basic_consume(queue=queue_name, on_message_callback=callback)
        
        logger.info("Reporting service started consuming events from RabbitMQ")
        channel.start_consuming()
        
    except Exception as e:
        logger.error(f"Failed to start RabbitMQ consumer: {e}")
