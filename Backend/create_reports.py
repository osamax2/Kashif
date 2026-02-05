#!/usr/bin/env python3
import requests
import os
import json
import time
import random

# Configuration
UPLOAD_URL = "http://172.18.0.11:8000/upload"
CREATE_REPORT_URL = "http://172.18.0.11:8000/"
PHOTOS_DIR = "/tmp/new_photos"

# We need a valid token - get one from auth service
AUTH_URL = "http://172.18.0.4:8000"

# Sample locations in Saudi Arabia
locations = [
    {"lat": 24.7136, "lon": 46.6753, "address": "Riyadh, King Fahd Road"},
    {"lat": 24.6877, "lon": 46.7219, "address": "Riyadh, Al Olaya District"},
    {"lat": 21.4225, "lon": 39.8262, "address": "Jeddah, Corniche Road"},
    {"lat": 21.5433, "lon": 39.1728, "address": "Jeddah, Al Balad"},
    {"lat": 26.4207, "lon": 50.0888, "address": "Dammam, King Saud Street"},
    {"lat": 24.4539, "lon": 39.6142, "address": "Medina, Al Haram Road"},
]

def get_auth_token():
    """Login and get a valid token"""
    # Try to login with test user
    login_data = {
        "phone": "+966500000001",
        "password": "password123"
    }
    try:
        response = requests.post(f"{AUTH_URL}/login", json=login_data)
        if response.status_code == 200:
            return response.json().get("access_token")
    except Exception as e:
        print(f"Login failed: {e}")
    return None

def main():
    # Get auth token
    token = get_auth_token()
    if not token:
        print("Failed to get auth token, trying to create reports anyway...")
        # Use a dummy token for testing
        token = "test_token"
    
    print(f"Using token: {token[:50]}...")
    
    # Get all photos
    photos = sorted([f for f in os.listdir(PHOTOS_DIR) if f.endswith('.jpg')])
    print(f"Found {len(photos)} photos")
    
    created_reports = []
    
    for i, photo in enumerate(photos):
        print(f"\nProcessing {i+1}/{len(photos)}: {photo}")
        
        photo_path = os.path.join(PHOTOS_DIR, photo)
        location = locations[i % len(locations)]
        
        # Add small random offset to location
        lat = location['lat'] + random.uniform(-0.01, 0.01)
        lon = location['lon'] + random.uniform(-0.01, 0.01)
        
        try:
            # Upload photo with AI analysis
            with open(photo_path, 'rb') as f:
                files = {'file': (photo, f, 'image/jpeg')}
                headers = {'Authorization': f'Bearer {token}'}
                response = requests.post(UPLOAD_URL, files=files, headers=headers)
            
            if response.status_code == 200:
                upload_result = response.json()
                print(f"  Uploaded: {upload_result.get('url')}")
                ai_analysis = upload_result.get('ai_analysis', {})
                print(f"  AI Analysis: is_pothole={ai_analysis.get('is_pothole')}, confidence={ai_analysis.get('confidence')}")
                if ai_analysis.get('annotated_url'):
                    print(f"  Annotated URL: {ai_analysis.get('annotated_url')}")
                
                created_reports.append({
                    'photo': photo,
                    'upload_result': upload_result,
                    'location': {'lat': lat, 'lon': lon, 'address': location['address']}
                })
            elif response.status_code == 401:
                print(f"  Auth error - skipping remaining photos")
                break
            else:
                print(f"  Error uploading: {response.status_code} - {response.text[:200]}")
        except Exception as e:
            print(f"  Exception: {e}")
        
        time.sleep(0.5)  # Rate limiting
    
    print(f"\n\nSuccessfully processed {len(created_reports)} photos")
    
    # Save results
    with open('/tmp/upload_results.json', 'w') as f:
        json.dump(created_reports, f, indent=2)
    print("Results saved to /tmp/upload_results.json")

if __name__ == "__main__":
    main()
