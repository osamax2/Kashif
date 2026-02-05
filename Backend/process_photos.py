#!/usr/bin/env python3
import requests
import os
import uuid
import shutil
import random
import psycopg2
import base64
import json
from datetime import datetime

# Configuration
POTHOLE_API = "http://172.18.0.15:8000"
PHOTOS_DIR = "/tmp/new_photos"
UPLOADS_DIR = "/var/lib/docker/volumes/backend_reporting_uploads/_data"

# DB Connection
DB_HOST = "172.18.0.7"
DB_NAME = "kashif_reports"
DB_USER = "kashif_reports"
DB_PASS = "report123"

# Locations in Hamburg
locations = [
    {"lat": 53.5511, "lon": 9.9937, "address": "Hamburg, Altstadt"},
    {"lat": 53.5495, "lon": 9.9632, "address": "Hamburg, Reeperbahn"},
    {"lat": 53.5411, "lon": 9.9988, "address": "Hamburg, HafenCity"},
    {"lat": 53.5896, "lon": 9.9842, "address": "Hamburg, Eppendorf"},
    {"lat": 53.5745, "lon": 9.9478, "address": "Hamburg, Eimsbuettel"},
    {"lat": 53.5512, "lon": 9.9356, "address": "Hamburg, Altona"},
]

def analyze_image(image_path):
    """Send image to AI service for analysis"""
    try:
        with open(image_path, "rb") as f:
            files = {"file": (os.path.basename(image_path), f, "image/jpeg")}
            response = requests.post(f"{POTHOLE_API}/analyze", files=files, timeout=30)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"  AI Error: {response.status_code}")
    except Exception as e:
        print(f"  AI Exception: {e}")
    return None

def main():
    # Get all photos
    photos = sorted([f for f in os.listdir(PHOTOS_DIR) if f.endswith(".jpg")])
    print(f"Found {len(photos)} photos")
    
    # Connect to DB
    conn = psycopg2.connect(host=DB_HOST, database=DB_NAME, user=DB_USER, password=DB_PASS)
    cur = conn.cursor()
    
    created = 0
    for i, photo in enumerate(photos):
        print(f"\n[{i+1}/{len(photos)}] Processing {photo}")
        photo_path = os.path.join(PHOTOS_DIR, photo)
        
        # Generate unique filename
        unique_id = str(uuid.uuid4())
        new_filename = f"{unique_id}.jpeg"
        dest_path = os.path.join(UPLOADS_DIR, new_filename)
        
        # Copy photo to uploads
        shutil.copy2(photo_path, dest_path)
        print(f"  Copied to {new_filename}")
        
        # Analyze with AI
        ai_result = analyze_image(photo_path)
        ai_annotated_url = None
        ai_detections = None
        
        if ai_result:
            is_pothole = ai_result.get("is_pothole")
            confidence = ai_result.get("confidence")
            print(f"  AI: is_pothole={is_pothole}, confidence={confidence}")
            
            # Save annotated image if available
            if ai_result.get("annotated_image"):
                annotated_filename = f"annotated_{unique_id}.jpeg"
                annotated_path = os.path.join(UPLOADS_DIR, annotated_filename)
                with open(annotated_path, "wb") as f:
                    f.write(base64.b64decode(ai_result["annotated_image"]))
                ai_annotated_url = f"/uploads/{annotated_filename}"
                print(f"  Annotated: {ai_annotated_url}")
            
            if ai_result.get("detections"):
                ai_detections = json.dumps(ai_result["detections"])
        
        # Get random location
        loc = locations[i % len(locations)]
        lat = loc["lat"] + random.uniform(-0.005, 0.005)
        lon = loc["lon"] + random.uniform(-0.005, 0.005)
        
        # Insert report
        cur.execute("""
            INSERT INTO reports (user_id, category_id, status_id, title, description, 
                latitude, longitude, address_text, severity_id, user_hide, 
                photo_urls, ai_annotated_url, ai_detections, confirmation_status, 
                points_awarded, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            11,  # user_id (osobaji)
            1,   # category_id (pothole)
            1,   # status_id (new)
            f"Schlagloch {photo}",
            f"Automatisch erkannt vom AI-System. Foto: {photo}",
            lat, lon, loc["address"],
            2,   # severity_id (medium)
            False,
            f"/uploads/{new_filename}",
            ai_annotated_url,
            ai_detections,
            "confirmed",
            False,
            datetime.now(),
            datetime.now()
        ))
        report_id = cur.fetchone()[0]
        conn.commit()
        print(f"  Created report ID: {report_id}")
        created += 1
    
    cur.close()
    conn.close()
    print(f"\n\nCreated {created} reports!")

if __name__ == "__main__":
    main()
