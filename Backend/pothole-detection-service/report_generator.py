"""
Report Generator Module
Creates reports in the reporting-service from pothole detections
"""
import json
import os
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional

import httpx

from auth_client import auth_client
from config import settings
from roboflow_detector import DetectionResult, PotholeDetection
from heic_processor import ImageMetadata


@dataclass
class GeneratedReport:
    """Generated report information"""
    report_id: Optional[int]
    success: bool
    error_message: Optional[str]
    image_path: str
    latitude: float
    longitude: float
    num_potholes: int
    max_severity: str
    
    def to_dict(self):
        return {
            "report_id": self.report_id,
            "success": self.success,
            "error_message": self.error_message,
            "image_path": self.image_path,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "num_potholes": self.num_potholes,
            "max_severity": self.max_severity
        }


class ReportGenerator:
    """
    Generates reports in the reporting-service from detection results.
    """
    
    # Severity ID mapping (must match database)
    SEVERITY_IDS = {
        "LOW": 1,
        "MEDIUM": 2,
        "HIGH": 3
    }
    
    # Category ID for potholes (must match database)
    POTHOLE_CATEGORY_ID = 1  # "حفر في الطريق" / "Pothole"
    
    def __init__(self):
        self.reporting_url = settings.REPORTING_SERVICE_URL
        self.admin_user_id = settings.ADMIN_USER_ID
    
    def _upload_image(self, image_path: str, token: str) -> Optional[str]:
        """Upload an image to the reporting service and return the URL"""
        import requests
        
        if not os.path.exists(image_path):
            print(f"❌ Image file not found: {image_path}")
            return None
        
        try:
            # Read the image file
            with open(image_path, 'rb') as f:
                image_data = f.read()
            
            # Get filename
            filename = os.path.basename(image_path)
            
            # Determine content type
            ext = os.path.splitext(filename)[1].lower()
            content_types = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp'
            }
            content_type = content_types.get(ext, 'image/jpeg')
            
            # Upload to reporting service
            files = {
                'file': (filename, image_data, content_type)
            }
            headers = {
                'Authorization': f'Bearer {token}'
            }
            
            response = requests.post(
                f"{self.reporting_url}/upload",
                files=files,
                headers=headers,
                timeout=30
            )
            
            if response.status_code in [200, 201]:
                result = response.json()
                upload_url = result.get('url')
                print(f"📤 Image uploaded: {upload_url}")
                return upload_url
            else:
                print(f"❌ Failed to upload image: {response.status_code} - {response.text[:200]}")
                return None
                
        except Exception as e:
            print(f"❌ Error uploading image: {str(e)}")
            return None
    
    def _build_description(
        self, 
        detection_result: DetectionResult, 
        metadata: ImageMetadata
    ) -> str:
        """Build Arabic/English description from detection data"""
        num_potholes = detection_result.num_potholes
        
        # Get details of each pothole
        details = []
        for i, det in enumerate(detection_result.detections, 1):
            detail = (
                f"حفرة {i}: العرض {det.estimated_width_cm} سم، "
                f"الطول {det.estimated_height_cm} سم، "
                f"العمق التقديري {det.estimated_depth_cm} سم، "
                f"الخطورة: {det.severity}"
            )
            details.append(detail)
        
        # Build full description
        description = f"🔍 تم الكشف التلقائي عن {num_potholes} حفرة/حفر في الطريق\n\n"
        description += "📊 تفاصيل الحفر:\n"
        description += "\n".join(details)
        
        # Add capture info
        if metadata.capture_date:
            description += f"\n\n📅 تاريخ الالتقاط: {metadata.capture_date.strftime('%Y-%m-%d %H:%M')}"
        if metadata.device_model:
            description += f"\n📱 الجهاز: {metadata.device_make or ''} {metadata.device_model}"
        
        description += f"\n📁 الملف الأصلي: {metadata.original_filename}"
        description += "\n\n⚠️ تم إنشاء هذا التقرير تلقائياً بواسطة نظام الكشف الذكي (YOLOv8)"
        
        return description
    
    def _build_title(self, detection_result: DetectionResult) -> str:
        """Build report title"""
        severity = detection_result.max_severity or "UNKNOWN"
        num = detection_result.num_potholes
        
        severity_ar = {
            "LOW": "منخفضة",
            "MEDIUM": "متوسطة", 
            "HIGH": "عالية"
        }
        
        return f"🚧 {num} حفرة - خطورة {severity_ar.get(severity, severity)}"
    
    async def create_report(
        self,
        detection_result: DetectionResult,
        metadata: ImageMetadata,
        photo_url: Optional[str] = None
    ) -> GeneratedReport:
        """
        Create a report in the reporting-service.
        
        Args:
            detection_result: YOLOv8 detection result
            metadata: Image metadata with GPS
            photo_url: URL to the uploaded photo (optional)
        
        Returns:
            GeneratedReport with success status
        """
        # Check GPS data
        if not metadata.gps:
            return GeneratedReport(
                report_id=None,
                success=False,
                error_message="No GPS data found in image",
                image_path=detection_result.image_path,
                latitude=0,
                longitude=0,
                num_potholes=detection_result.num_potholes,
                max_severity=detection_result.max_severity or "UNKNOWN"
            )
        
        # Check if any potholes detected
        if detection_result.num_potholes == 0:
            return GeneratedReport(
                report_id=None,
                success=False,
                error_message="No potholes detected in image",
                image_path=detection_result.image_path,
                latitude=metadata.gps.latitude,
                longitude=metadata.gps.longitude,
                num_potholes=0,
                max_severity="NONE"
            )
        
        # Build report data
        severity_id = self.SEVERITY_IDS.get(detection_result.max_severity, 2)
        
        # Store detection details as JSON in description
        detection_data = {
            "auto_detected": True,
            "model": "YOLOv8",
            "detections": [d.to_dict() for d in detection_result.detections],
            "processing_time_ms": detection_result.processing_time_ms
        }
        
        report_data = {
            "title": self._build_title(detection_result),
            "description": self._build_description(detection_result, metadata),
            "category_id": self.POTHOLE_CATEGORY_ID,
            "latitude": str(metadata.gps.latitude),
            "longitude": str(metadata.gps.longitude),
            "severity_id": severity_id,
            "photo_urls": json.dumps({
                "original": metadata.original_filename,
                "annotated": detection_result.annotated_image_path,
                "url": photo_url
            }) if photo_url else None
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Create report via API
                response = await client.post(
                    f"{self.reporting_url}/",
                    json=report_data,
                    headers={
                        "X-User-ID": str(self.admin_user_id),
                        "Content-Type": "application/json"
                    }
                )
                
                if response.status_code in (200, 201):
                    result = response.json()
                    report_id = result.get("id")
                    
                    print(f"✅ Created report #{report_id} for {metadata.original_filename}")
                    
                    return GeneratedReport(
                        report_id=report_id,
                        success=True,
                        error_message=None,
                        image_path=detection_result.image_path,
                        latitude=metadata.gps.latitude,
                        longitude=metadata.gps.longitude,
                        num_potholes=detection_result.num_potholes,
                        max_severity=detection_result.max_severity or "UNKNOWN"
                    )
                else:
                    error_msg = f"API error: {response.status_code} - {response.text}"
                    print(f"❌ Failed to create report: {error_msg}")
                    
                    return GeneratedReport(
                        report_id=None,
                        success=False,
                        error_message=error_msg,
                        image_path=detection_result.image_path,
                        latitude=metadata.gps.latitude,
                        longitude=metadata.gps.longitude,
                        num_potholes=detection_result.num_potholes,
                        max_severity=detection_result.max_severity or "UNKNOWN"
                    )
        
        except Exception as e:
            error_msg = f"Exception: {str(e)}"
            print(f"❌ Error creating report: {error_msg}")
            
            return GeneratedReport(
                report_id=None,
                success=False,
                error_message=error_msg,
                image_path=detection_result.image_path,
                latitude=metadata.gps.latitude,
                longitude=metadata.gps.longitude,
                num_potholes=detection_result.num_potholes,
                max_severity=detection_result.max_severity or "UNKNOWN"
            )
    
    def create_report_sync(
        self,
        detection_result: DetectionResult,
        metadata: ImageMetadata,
        photo_url: Optional[str] = None
    ) -> GeneratedReport:
        """Synchronous version of create_report using requests"""
        import requests
        
        try:
            if not metadata.gps:
                return GeneratedReport(
                    report_id=None,
                    success=False,
                    error_message="No GPS data available",
                    image_path=detection_result.image_path,
                    latitude=0,
                    longitude=0,
                    num_potholes=detection_result.num_potholes,
                    max_severity=detection_result.max_severity or "UNKNOWN"
                )
            
            if detection_result.num_potholes == 0:
                return GeneratedReport(
                    report_id=None,
                    success=False,
                    error_message="No potholes detected",
                    image_path=detection_result.image_path,
                    latitude=metadata.gps.latitude,
                    longitude=metadata.gps.longitude,
                    num_potholes=0,
                    max_severity="NONE"
                )
            
            # Get auth token
            token = auth_client.get_token()
            if not token:
                return GeneratedReport(
                    report_id=None,
                    success=False,
                    error_message="Failed to get auth token",
                    image_path=detection_result.image_path,
                    latitude=metadata.gps.latitude,
                    longitude=metadata.gps.longitude,
                    num_potholes=detection_result.num_potholes,
                    max_severity=detection_result.max_severity or "UNKNOWN"
                )
            
            # Upload the JPEG image first
            uploaded_photo_url = None
            if detection_result.image_path and os.path.exists(detection_result.image_path):
                print(f"📤 Uploading image: {detection_result.image_path}")
                uploaded_photo_url = self._upload_image(detection_result.image_path, token)
            
            # Also try to upload annotated image if available
            annotated_url = None
            if detection_result.annotated_image_path and os.path.exists(detection_result.annotated_image_path):
                print(f"📤 Uploading annotated image: {detection_result.annotated_image_path}")
                annotated_url = self._upload_image(detection_result.annotated_image_path, token)
            
            # Build report data inline
            severity_id = self.SEVERITY_IDS.get(detection_result.max_severity, 2)
            
            # Create photo_urls JSON with uploaded URLs
            photo_urls_data = {
                "original": metadata.original_filename,
                "photo": uploaded_photo_url,
                "annotated": annotated_url
            }
            
            report_data = {
                "title": self._build_title(detection_result),
                "description": self._build_description(detection_result, metadata),
                "category_id": self.POTHOLE_CATEGORY_ID,
                "latitude": str(metadata.gps.latitude),
                "longitude": str(metadata.gps.longitude),
                "severity_id": severity_id,
                "photo_urls": json.dumps(photo_urls_data) if uploaded_photo_url else None
            }
            
            # Use requests for sync call with auth token
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}"
            }
            response = requests.post(
                f"{self.reporting_url}/",
                json=report_data,
                headers=headers,
                timeout=30
            )
            
            if response.status_code in [200, 201]:
                result = response.json()
                report_id = result.get("id") or result.get("report_id")
                print(f"✅ Report created: {report_id}")
                
                return GeneratedReport(
                    report_id=report_id,
                    success=True,
                    error_message=None,
                    image_path=detection_result.image_path,
                    latitude=metadata.gps.latitude,
                    longitude=metadata.gps.longitude,
                    num_potholes=detection_result.num_potholes,
                    max_severity=detection_result.max_severity or "UNKNOWN"
                )
            else:
                error_msg = f"API error: {response.status_code} - {response.text}"
                print(f"❌ Failed to create report: {error_msg}")
                
                return GeneratedReport(
                    report_id=None,
                    success=False,
                    error_message=error_msg,
                    image_path=detection_result.image_path,
                    latitude=metadata.gps.latitude,
                    longitude=metadata.gps.longitude,
                    num_potholes=detection_result.num_potholes,
                    max_severity=detection_result.max_severity or "UNKNOWN"
                )
        
        except Exception as e:
            error_msg = f"Exception: {str(e)}"
            print(f"❌ Error creating report: {error_msg}")
            
            return GeneratedReport(
                report_id=None,
                success=False,
                error_message=error_msg,
                image_path=detection_result.image_path,
                latitude=metadata.gps.latitude if metadata.gps else 0,
                longitude=metadata.gps.longitude if metadata.gps else 0,
                num_potholes=detection_result.num_potholes,
                max_severity=detection_result.max_severity or "UNKNOWN"
            )
