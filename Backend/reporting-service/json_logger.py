# json_logger.py - Structured JSON logging for Kashif microservices
import json
import logging
import os
import sys
from contextvars import ContextVar

# Context variable for request ID tracking across async calls
request_id_var: ContextVar[str] = ContextVar("request_id", default="-")


class JSONFormatter(logging.Formatter):
    """Formats log records as structured JSON."""

    def __init__(self, service_name: str):
        super().__init__()
        self.service_name = service_name

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S")
            + f".{int(record.msecs):03d}Z",
            "level": record.levelname,
            "service": self.service_name,
            "request_id": request_id_var.get("-"),
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Add exception info if present
        if record.exc_info and record.exc_info[0]:
            log_entry["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "traceback": self.formatException(record.exc_info),
            }

        # Add extra fields from request logging middleware
        for key in [
            "status_code",
            "method",
            "path",
            "duration_ms",
            "client_ip",
            "user_id",
        ]:
            if hasattr(record, key):
                log_entry[key] = getattr(record, key)

        return json.dumps(log_entry, ensure_ascii=False)


def setup_logging(service_name: str, level: str = None) -> logging.Logger:
    """Set up structured JSON logging for a service.

    Args:
        service_name: Name of the microservice (e.g. 'auth', 'reporting')
        level: Log level override (default: LOG_LEVEL env var or INFO)

    Returns:
        Configured logger instance for the service
    """
    log_level = getattr(
        logging, (level or os.getenv("LOG_LEVEL", "INFO")).upper(), logging.INFO
    )

    # Remove all existing handlers to prevent duplicate output
    root_logger = logging.getLogger()
    root_logger.handlers.clear()

    # Configure JSON handler writing to stdout (Docker captures stdout)
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter(service_name))

    root_logger.setLevel(log_level)
    root_logger.addHandler(handler)

    # Reduce noise from third-party libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("pika").setLevel(logging.WARNING)

    logger = logging.getLogger(service_name)
    logger.info(f"Structured JSON logging initialized for {service_name}")
    return logger
