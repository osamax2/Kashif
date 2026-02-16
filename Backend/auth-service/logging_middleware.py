# logging_middleware.py - Request logging middleware with request-ID tracing
import logging
import time
import uuid

from json_logger import request_id_var
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware that logs every HTTP request with timing and request-ID tracing."""

    async def dispatch(self, request: Request, call_next):
        # Generate or use existing request ID for distributed tracing
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])
        request_id_var.set(request_id)

        start_time = time.time()

        try:
            response = await call_next(request)
            duration_ms = round((time.time() - start_time) * 1000, 2)

            # Skip health check logging to reduce noise
            if request.url.path not in ("/health", "/health/detailed"):
                logger.info(
                    f"{request.method} {request.url.path} -> {response.status_code}",
                    extra={
                        "method": request.method,
                        "path": str(request.url.path),
                        "status_code": response.status_code,
                        "duration_ms": duration_ms,
                        "client_ip": request.client.host if request.client else "-",
                    },
                )

            # Pass request ID to response for client-side tracing
            response.headers["X-Request-ID"] = request_id
            return response

        except Exception as e:
            duration_ms = round((time.time() - start_time) * 1000, 2)
            logger.error(
                f"{request.method} {request.url.path} -> ERROR: {str(e)}",
                extra={
                    "method": request.method,
                    "path": str(request.url.path),
                    "duration_ms": duration_ms,
                    "client_ip": request.client.host if request.client else "-",
                },
                exc_info=True,
            )
            raise
