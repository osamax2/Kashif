import logging
import os

import httpx

logger = logging.getLogger(__name__)

GAMIFICATION_SERVICE_URL = os.getenv("GAMIFICATION_SERVICE_URL", "http://gamification-service:8000")


async def get_user_points(token: str) -> int:
    """Get user's total points from gamification service"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{GAMIFICATION_SERVICE_URL}/points/me",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get("total_points", 0)
            else:
                logger.error(f"Failed to get user points: {response.status_code}")
                return 0
                
    except Exception as e:
        logger.error(f"Error getting user points: {e}")
        return 0


async def redeem_points(token: str, points: int, coupon_id: int) -> bool:
    """Redeem points for a coupon via gamification service"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{GAMIFICATION_SERVICE_URL}/points/redeem",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "points": points,
                    "coupon_id": coupon_id
                }
            )
            
            if response.status_code == 200:
                logger.info(f"Successfully redeemed {points} points for coupon {coupon_id}")
                return True
            else:
                logger.error(f"Failed to redeem points: {response.status_code} - {response.text}")
                return False
                
    except Exception as e:
        logger.error(f"Error redeeming points: {e}")
        return False
