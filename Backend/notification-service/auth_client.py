import logging
import os
from typing import List, Optional

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


async def get_users_by_role(token: str, role: Optional[str] = None) -> List[dict]:
    """Get users from auth service, optionally filtered by role"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{AUTH_SERVICE_URL}/users",
                headers={"Authorization": f"Bearer {token}"},
                params={"skip": 0, "limit": 10000}
            )
            
            if response.status_code == 200:
                users = response.json()
                if role:
                    # Filter users by role
                    users = [u for u in users if u.get("role", "").upper() == role.upper()]
                return users
            else:
                logger.error(f"Failed to get users: {response.status_code}")
                return []
                
    except Exception as e:
        logger.error(f"Failed to get users from auth service: {e}")
        return []
