"""
AI Detection Client
Calls the pothole-detection-service to analyze images
"""
import os
import logging
import httpx
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# Pothole detection service URL
AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://kashif-pothole-detection:8006")


async def analyze_image(image_path: str, upload_dir: str = "/app/uploads") -> Optional[Dict[str, Any]]:
    """
    Send an image to the AI service for pothole analysis.
    
    Args:
        image_path: Path to the image file (can be relative URL like /uploads/xxx.jpg)
        upload_dir: Base directory for uploads
        
    Returns:
        AI analysis result with description, or None if failed
    """
    try:
        # Build full file path
        if image_path.startswith("/uploads/"):
            full_path = os.path.join(upload_dir, os.path.basename(image_path))
        else:
            full_path = image_path
        
        if not os.path.exists(full_path):
            logger.warning(f"Image file not found: {full_path}")
            return None
        
        # Get filename and determine content type
        filename = os.path.basename(full_path)
        ext = os.path.splitext(filename)[1].lower()
        
        content_type_map = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.heic': 'image/heic',
            '.heif': 'image/heif'
        }
        content_type = content_type_map.get(ext, 'image/jpeg')
        
        # Read file and send to AI service with enhanced depth estimation
        # MiDaS depth estimation via Replicate can take 4-5 minutes on cold start
        async with httpx.AsyncClient(timeout=360.0) as client:  # 6 min timeout for depth estimation
            with open(full_path, 'rb') as f:
                files = {'file': (filename, f, content_type)}
                
                response = await client.post(
                    f"{AI_SERVICE_URL}/analyze-enhanced",
                    files=files
                )
                
                if response.status_code == 200:
                    result = response.json()
                    logger.info(f"AI analysis successful: {result.get('num_potholes', 0)} potholes detected")
                    return result
                else:
                    logger.error(f"AI service returned error: {response.status_code} - {response.text}")
                    return None
                    
    except httpx.TimeoutException:
        logger.error("AI service timeout")
        return None
    except httpx.ConnectError:
        logger.error(f"Cannot connect to AI service at {AI_SERVICE_URL}")
        return None
    except Exception as e:
        logger.error(f"AI analysis error: {e}")
        return None


async def check_ai_service_health() -> bool:
    """Check if AI service is available"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{AI_SERVICE_URL}/health")
            return response.status_code == 200
    except Exception:
        return False
