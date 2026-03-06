"""
Notification Client
Sends push notifications via the notification-service
"""
import os
import logging
import httpx
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

NOTIFICATION_SERVICE_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://kashif-notification:8004")


async def send_push_notification(
    user_id: int,
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None,
    notification_type: str = "report_update"
) -> bool:
    """
    Send a push notification to a user via the notification service.
    
    Args:
        user_id: User ID to send notification to
        title: Notification title
        body: Notification body text
        data: Optional data payload
        notification_type: Type of notification for preference checking
        
    Returns:
        True if sent successfully, False otherwise
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{NOTIFICATION_SERVICE_URL}/internal/push",
                json={
                    "user_id": user_id,
                    "title": title,
                    "body": body,
                    "data": data or {},
                    "notification_type": notification_type
                },
                headers={"X-Internal-Key": os.getenv("INTERNAL_API_KEY", "kashif-internal-secret-2026")}
            )
            
            if response.status_code == 200:
                logger.info(f"Push notification sent to user {user_id}")
                return True
            else:
                logger.warning(f"Failed to send push notification: {response.status_code}")
                return False
                
    except Exception as e:
        logger.error(f"Error sending push notification: {e}")
        return False


async def notify_report_ai_complete(
    user_id: int,
    report_id: int,
    success: bool,
    num_potholes: int = 0,
    language: str = "en"
) -> bool:
    """
    Send notification when AI analysis is complete.
    
    Args:
        user_id: User who submitted the report
        report_id: Report ID
        success: Whether AI analysis succeeded
        num_potholes: Number of potholes detected
        language: User's preferred language
    """
    if success:
        if language == "ar":
            title = "✅ تم تحليل البلاغ"
            body = f"تم اكتشاف {num_potholes} حفرة/حفر في صورتك" if num_potholes > 0 else "تم معالجة صورتك بنجاح"
        elif language == "ku":
            title = "✅ Analîza raporê qediya"
            body = f"{num_potholes} çal hat dîtin di wêneya te de" if num_potholes > 0 else "Wêneya te bi serkeftî hat pêvajo kirin"
        else:
            title = "✅ Report Analysis Complete"
            body = f"Detected {num_potholes} pothole(s) in your image" if num_potholes > 0 else "Your image was processed successfully"
    else:
        if language == "ar":
            title = "⚠️ فشل التحليل"
            body = "تعذر تحليل صورتك. تم حفظ البلاغ بدون تحليل AI."
        elif language == "ku":
            title = "⚠️ Analîz têk çû"
            body = "Nikarî wêneya te analîz bike. Rapor bêyî analîza AI-ê hate tomarkirin."
        else:
            title = "⚠️ Analysis Failed"
            body = "Could not analyze your image. Report saved without AI analysis."
    
    return await send_push_notification(
        user_id=user_id,
        title=title,
        body=body,
        data={
            "report_id": str(report_id),
            "type": "ai_analysis_complete",
            "success": str(success)
        },
        notification_type="report_update"
    )
