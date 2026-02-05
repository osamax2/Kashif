#!/usr/bin/env python3
"""
Script to process photos with AI detection and extract GPS from EXIF data.
Updates existing reports with correct GPS and annotated images.
"""
import httpx
import base64
import json
import os
import io
from datetime import datetime
from PIL import Image
import exifread

# Configuration
POTHOLE_API = "http://pothole-detection:8006"
UPLOADS_DIR = "/app/uploads"
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://kashif_reports:report123@reporting-db:5432/kashif_reports")

def convert_to_degrees(value) -> float:
    """Convert GPS coordinates from EXIF format to decimal degrees."""
    try:
        d = float(value.values[0].num) / float(value.values[0].den)
        m = float(value.values[1].num) / float(value.values[1].den)
        s = float(value.values[2].num) / float(value.values[2].den)
        return d + (m / 60.0) + (s / 3600.0)
    except (AttributeError, IndexError, ZeroDivisionError):
        return 0.0

def extract_gps_from_image(image_path: str):
    """Extract GPS coordinates from image EXIF data."""
    try:
        with open(image_path, 'rb') as f:
            tags = exifread.process_file(f, details=False)
        
        if "GPS GPSLatitude" not in tags or "GPS GPSLongitude" not in tags:
            return None, None
        
        lat = convert_to_degrees(tags["GPS GPSLatitude"])
        lon = convert_to_degrees(tags["GPS GPSLongitude"])
        
        # Apply hemisphere reference
        if "GPS GPSLatitudeRef" in tags:
            if str(tags["GPS GPSLatitudeRef"]) == "S":
                lat = -lat
        
        if "GPS GPSLongitudeRef" in tags:
            if str(tags["GPS GPSLongitudeRef"]) == "W":
                lon = -lon
        
        return lat, lon
    except Exception as e:
        print(f"  GPS extraction error: {e}")
        return None, None

def draw_bounding_boxes(image_path: str, detections: list, output_path: str):
    """Draw bounding boxes on image using PIL."""
    try:
        from PIL import ImageDraw, ImageFont
        
        img = Image.open(image_path)
        draw = ImageDraw.Draw(img)
        
        # Colors for different severity
        colors = {
            'HIGH': (255, 0, 0),      # Red
            'MEDIUM': (255, 165, 0),  # Orange
            'LOW': (255, 255, 0)      # Yellow
        }
        
        for det in detections:
            bbox = det.get('bbox', {})
            x1 = bbox.get('x1', 0)
            y1 = bbox.get('y1', 0)
            x2 = bbox.get('x2', 0)
            y2 = bbox.get('y2', 0)
            confidence = det.get('confidence', 0)
            
            # Determine color based on confidence
            if confidence > 0.8:
                color = colors['HIGH']
            elif confidence > 0.5:
                color = colors['MEDIUM']
            else:
                color = colors['LOW']
            
            # Draw rectangle with thick border
            for i in range(5):  # 5px thick border
                draw.rectangle([x1-i, y1-i, x2+i, y2+i], outline=color)
            
            # Draw label
            label = f"Pothole {confidence:.0%}"
            draw.rectangle([x1, y1-30, x1+150, y1], fill=color)
            draw.text((x1+5, y1-25), label, fill=(255, 255, 255))
        
        # Save
        img.save(output_path, 'JPEG', quality=90)
        return True
    except Exception as e:
        print(f"  Drawing error: {e}")
        return False

def analyze_image(image_path: str):
    """Send image to AI service for analysis (fast endpoint)."""
    try:
        with open(image_path, "rb") as f:
            files = {"file": (os.path.basename(image_path), f, "image/jpeg")}
            response = httpx.post(f"{POTHOLE_API}/analyze", files=files, timeout=120.0)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"  AI Error: {response.status_code}")
    except Exception as e:
        print(f"  AI Exception: {e}")
    return None

def main():
    from sqlalchemy import create_engine, text
    
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # Get reports that need processing (ID >= 375)
        result = conn.execute(text("""
            SELECT id, photo_urls, ai_detections FROM reports 
            WHERE id >= 375
            ORDER BY id
        """))
        reports = result.fetchall()
        
        print(f"Found {len(reports)} reports to process")
        
        updated = 0
        for i, (report_id, photo_urls, existing_detections) in enumerate(reports):
            print(f"\n[{i+1}/{len(reports)}] Processing report {report_id}")
            
            if not photo_urls:
                print("  No photo URL")
                continue
            
            # Get the photo filename from the URL
            photo_filename = photo_urls.replace("/uploads/", "")
            photo_path = os.path.join(UPLOADS_DIR, photo_filename)
            
            if not os.path.exists(photo_path):
                print(f"  Photo not found: {photo_path}")
                continue
            
            # Extract GPS from photo
            lat, lon = extract_gps_from_image(photo_path)
            if lat and lon:
                print(f"  GPS: {lat:.6f}, {lon:.6f}")
            else:
                print("  No GPS data in photo")
            
            # Get AI analysis if not already done
            detections = None
            if existing_detections:
                try:
                    detections = json.loads(existing_detections)
                    print(f"  Using existing detections: {len(detections)} found")
                except:
                    pass
            
            if not detections:
                ai_result = analyze_image(photo_path)
                if ai_result and ai_result.get("detections"):
                    detections = ai_result["detections"]
                    print(f"  AI detected: {len(detections)} pothole(s)")
            
            # Create annotated image
            ai_annotated_url = None
            if detections:
                unique_id = photo_filename.replace(".jpeg", "").replace(".jpg", "")
                annotated_filename = f"annotated_{unique_id}.jpeg"
                annotated_path = os.path.join(UPLOADS_DIR, annotated_filename)
                
                if draw_bounding_boxes(photo_path, detections, annotated_path):
                    ai_annotated_url = f"/uploads/{annotated_filename}"
                    print(f"  Annotated: {ai_annotated_url}")
            
            # Update the report
            update_parts = []
            params = {"report_id": report_id}
            
            if lat and lon:
                update_parts.append("latitude = :lat, longitude = :lon")
                params["lat"] = lat
                params["lon"] = lon
            
            if ai_annotated_url:
                update_parts.append("ai_annotated_url = :annotated_url")
                params["annotated_url"] = ai_annotated_url
            
            if detections and not existing_detections:
                update_parts.append("ai_detections = :detections")
                params["detections"] = json.dumps(detections)
            
            if update_parts:
                query = f"UPDATE reports SET {', '.join(update_parts)} WHERE id = :report_id"
                conn.execute(text(query), params)
                conn.commit()
                print(f"  Updated report {report_id}")
                updated += 1
        
        print(f"\n\nUpdated {updated} reports!")

if __name__ == "__main__":
    main()
