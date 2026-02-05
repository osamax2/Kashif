#!/usr/bin/env python3
"""Script to add AI analysis to existing reports"""
import httpx
import base64
import json
import os
from sqlalchemy import create_engine, text

# Configuration
POTHOLE_API = "http://pothole-detection:8006"
UPLOADS_DIR = "/app/uploads"
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://kashif_reports:report123@reporting-db:5432/kashif_reports")

def analyze_image(image_path):
    """Send image to AI service for analysis"""
    try:
        with open(image_path, "rb") as f:
            files = {"file": (os.path.basename(image_path), f, "image/jpeg")}
            response = httpx.post(f"{POTHOLE_API}/analyze", files=files, timeout=60.0)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"  AI Error: {response.status_code} - {response.text[:100]}")
    except Exception as e:
        print(f"  AI Exception: {e}")
    return None

def main():
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # Get reports without AI analysis (ID >= 375)
        result = conn.execute(text("""
            SELECT id, photo_urls FROM reports 
            WHERE id >= 375 AND ai_annotated_url IS NULL
            ORDER BY id
        """))
        reports = result.fetchall()
        
        print(f"Found {len(reports)} reports without AI analysis")
        
        for i, (report_id, photo_urls) in enumerate(reports):
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
            
            # Analyze with AI
            ai_result = analyze_image(photo_path)
            
            if ai_result:
                is_pothole = ai_result.get("is_pothole")
                confidence = ai_result.get("confidence")
                print(f"  AI: is_pothole={is_pothole}, confidence={confidence}")
                
                ai_annotated_url = None
                ai_detections = None
                
                # Save annotated image if available
                if ai_result.get("annotated_image"):
                    unique_id = photo_filename.replace(".jpeg", "")
                    annotated_filename = f"annotated_{unique_id}.jpeg"
                    annotated_path = os.path.join(UPLOADS_DIR, annotated_filename)
                    with open(annotated_path, "wb") as f:
                        f.write(base64.b64decode(ai_result["annotated_image"]))
                    ai_annotated_url = f"/uploads/{annotated_filename}"
                    print(f"  Annotated: {ai_annotated_url}")
                
                if ai_result.get("detections"):
                    ai_detections = json.dumps(ai_result["detections"])
                
                # Update the report
                conn.execute(text("""
                    UPDATE reports 
                    SET ai_annotated_url = :annotated_url, 
                        ai_detections = :detections
                    WHERE id = :report_id
                """), {
                    "annotated_url": ai_annotated_url,
                    "detections": ai_detections,
                    "report_id": report_id
                })
                conn.commit()
                print(f"  Updated report {report_id}")
            else:
                print("  No AI result")
        
        print("\n\nDone!")

if __name__ == "__main__":
    main()
