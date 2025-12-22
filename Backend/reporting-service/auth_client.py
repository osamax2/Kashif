import logging
import os

import httpx

logger = logging.getLogger(__name__)

AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://auth-service:8000")


async def verify_token(token: str):
    """Verify token with auth service"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{AUTH_SERVICE_URL}/me",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return None
                
    except Exception as e:
        logger.error(f"Failed to verify token with auth service: {e}")
        return None


def get_user_by_id(user_id: int):
    """Get user info by user ID from auth service (synchronous)
    Uses the internal endpoint that doesn't require authentication.
    """
    try:
        with httpx.Client(timeout=5.0) as client:
            # Use internal endpoint for service-to-service communication
            response = client.get(f"{AUTH_SERVICE_URL}/internal/users/{user_id}")
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(f"Auth service returned {response.status_code} for user {user_id}")
                return None
                
    except Exception as e:
        logger.error(f"Failed to get user {user_id} from auth service: {e}")
        return None
