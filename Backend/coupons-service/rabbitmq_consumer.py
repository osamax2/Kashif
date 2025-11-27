import pika
import json
import os
import logging

logger = logging.getLogger(__name__)

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")


def handle_points_redeemed(event_data):
    """Handle points.redeemed event"""
    logger.info(f"Points redeemed event received: {event_data}")
    # Could update coupon redemption stats or send notifications


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
        
        result = channel.queue_declare(queue='coupons_service_queue', durable=True)
        queue_name = result.method.queue
        
        # Bind to relevant events
        channel.queue_bind(
            exchange='kashif_events',
            queue=queue_name,
            routing_key='points.redeemed'
        )
        
        def callback(ch, method, properties, body):
            try:
                message = json.loads(body)
                event_type = message.get('event_type')
                data = message.get('data')
                
                logger.info(f"Received event: {event_type}")
                
                if event_type == 'points.redeemed':
                    handle_points_redeemed(data)
                
                ch.basic_ack(delivery_tag=method.delivery_tag)
                
            except Exception as e:
                logger.error(f"Error processing message: {e}")
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        
        channel.basic_consume(queue=queue_name, on_message_callback=callback)
        
        logger.info("Coupons service started consuming events from RabbitMQ")
        channel.start_consuming()
        
    except Exception as e:
        logger.error(f"Failed to start RabbitMQ consumer: {e}")
