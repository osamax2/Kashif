#!/usr/bin/env python3
"""
Seed script to add fake reports in Hamburg for testing
"""
import requests
import random
from datetime import datetime, timedelta

# API Configuration
API_BASE_URL = "https://api.kashifroad.com"

# Hamburg coordinates (center and various areas)
HAMBURG_LOCATIONS = [
    # City Center / Altstadt
    {"lat": 53.5511, "lon": 9.9937, "area": "Altstadt"},
    {"lat": 53.5488, "lon": 9.9872, "area": "Rathaus"},
    {"lat": 53.5503, "lon": 10.0006, "area": "Mönckebergstraße"},
    
    # St. Pauli / Reeperbahn
    {"lat": 53.5495, "lon": 9.9632, "area": "Reeperbahn"},
    {"lat": 53.5514, "lon": 9.9589, "area": "St. Pauli"},
    {"lat": 53.5478, "lon": 9.9545, "area": "Landungsbrücken"},
    
    # HafenCity
    {"lat": 53.5411, "lon": 9.9988, "area": "HafenCity"},
    {"lat": 53.5395, "lon": 10.0052, "area": "Elbphilharmonie"},
    {"lat": 53.5367, "lon": 10.0089, "area": "Speicherstadt"},
    
    # Eppendorf / Winterhude
    {"lat": 53.5896, "lon": 9.9842, "area": "Eppendorf"},
    {"lat": 53.5988, "lon": 10.0023, "area": "Winterhude"},
    {"lat": 53.5834, "lon": 9.9756, "area": "Alster"},
    
    # Eimsbüttel
    {"lat": 53.5745, "lon": 9.9478, "area": "Eimsbüttel"},
    {"lat": 53.5689, "lon": 9.9345, "area": "Schanzenviertel"},
    
    # Barmbek / Wandsbek
    {"lat": 53.5856, "lon": 10.0389, "area": "Barmbek"},
    {"lat": 53.5723, "lon": 10.0867, "area": "Wandsbek"},
    
    # Altona
    {"lat": 53.5512, "lon": 9.9356, "area": "Altona"},
    {"lat": 53.5634, "lon": 9.9123, "area": "Ottensen"},
    
    # Harburg (South)
    {"lat": 53.4612, "lon": 9.9845, "area": "Harburg"},
    {"lat": 53.4534, "lon": 9.9678, "area": "Harburg-Center"},
    
    # Bergedorf (East)
    {"lat": 53.4889, "lon": 10.2123, "area": "Bergedorf"},
    
    # Blankenese (West)
    {"lat": 53.5634, "lon": 9.8234, "area": "Blankenese"},
    
    # Airport Area
    {"lat": 53.6312, "lon": 9.9912, "area": "Flughafen"},
    
    # Hauptbahnhof
    {"lat": 53.5527, "lon": 10.0069, "area": "Hauptbahnhof"},
    
    # Jungfernstieg
    {"lat": 53.5534, "lon": 9.9932, "area": "Jungfernstieg"},
]

# Report categories (adjust IDs based on your database)
CATEGORIES = [
    {"id": 1, "name": "Infrastructure", "name_ar": "البنية التحتية"},
    {"id": 2, "name": "Environment", "name_ar": "البيئة"},
    {"id": 3, "name": "Traffic", "name_ar": "المرور"},
    {"id": 4, "name": "Public Safety", "name_ar": "السلامة العامة"},
    {"id": 5, "name": "Utilities", "name_ar": "المرافق"},
]

# Report templates
REPORT_TEMPLATES = [
    # Infrastructure (Category 1)
    {"category_id": 1, "title": "Schlagloch auf der Straße", "title_ar": "حفرة في الطريق", 
     "description": "Großes Schlagloch gefährdet den Verkehr", "description_ar": "حفرة كبيرة تهدد حركة المرور"},
    {"category_id": 1, "title": "Beschädigter Bürgersteig", "title_ar": "رصيف متضرر",
     "description": "Gehweg ist beschädigt und gefährlich für Fußgänger", "description_ar": "الرصيف متضرر وخطير على المشاة"},
    {"category_id": 1, "title": "Defekte Straßenlaterne", "title_ar": "عمود إنارة معطل",
     "description": "Straßenlaterne funktioniert nicht", "description_ar": "عمود الإنارة لا يعمل"},
    {"category_id": 1, "title": "Brücke benötigt Reparatur", "title_ar": "جسر يحتاج إصلاح",
     "description": "Sichtbare Schäden an der Brückenstruktur", "description_ar": "أضرار واضحة في هيكل الجسر"},
    
    # Environment (Category 2)
    {"category_id": 2, "title": "Illegale Müllentsorgung", "title_ar": "رمي نفايات غير قانوني",
     "description": "Müll wurde illegal entsorgt", "description_ar": "تم التخلص من النفايات بشكل غير قانوني"},
    {"category_id": 2, "title": "Umgestürzter Baum", "title_ar": "شجرة ساقطة",
     "description": "Baum ist umgestürzt und blockiert den Weg", "description_ar": "شجرة سقطت وتسد الطريق"},
    {"category_id": 2, "title": "Wasserverschmutzung", "title_ar": "تلوث المياه",
     "description": "Verdächtige Substanzen im Wasser bemerkt", "description_ar": "لوحظت مواد مشبوهة في الماء"},
    {"category_id": 2, "title": "Überfüllte Mülltonne", "title_ar": "حاوية قمامة ممتلئة",
     "description": "Öffentliche Mülltonne ist überfüllt", "description_ar": "حاوية القمامة العامة ممتلئة"},
    
    # Traffic (Category 3)
    {"category_id": 3, "title": "Radar-Blitzer", "title_ar": "رادار سرعة",
     "description": "Geschwindigkeitskontrolle an dieser Stelle", "description_ar": "مراقبة السرعة في هذا الموقع"},
    {"category_id": 3, "title": "Verkehrsunfall", "title_ar": "حادث مروري",
     "description": "Unfall auf der Straße, Vorsicht geboten", "description_ar": "حادث على الطريق، يرجى الحذر"},
    {"category_id": 3, "title": "Stau auf der Autobahn", "title_ar": "ازدحام على الطريق السريع",
     "description": "Langer Stau durch Baustelle", "description_ar": "ازدحام طويل بسبب أعمال البناء"},
    {"category_id": 3, "title": "Defekte Ampel", "title_ar": "إشارة مرور معطلة",
     "description": "Ampel funktioniert nicht korrekt", "description_ar": "إشارة المرور لا تعمل بشكل صحيح"},
    {"category_id": 3, "title": "Polizeikontrolle", "title_ar": "نقطة تفتيش شرطة",
     "description": "Polizeikontrolle auf der Straße", "description_ar": "نقطة تفتيش شرطة على الطريق"},
    {"category_id": 3, "title": "Baustelle auf der Straße", "title_ar": "أعمال بناء على الطريق",
     "description": "Straßenarbeiten verursachen Verzögerungen", "description_ar": "أعمال الطريق تسبب تأخيرات"},
    
    # Public Safety (Category 4)
    {"category_id": 4, "title": "Defekte Straßenbeleuchtung", "title_ar": "إنارة شارع معطلة",
     "description": "Dunkler Bereich, Beleuchtung ausgefallen", "description_ar": "منطقة مظلمة، الإنارة معطلة"},
    {"category_id": 4, "title": "Gefährliche Kreuzung", "title_ar": "تقاطع خطير",
     "description": "Unübersichtliche Kreuzung ohne Beschilderung", "description_ar": "تقاطع غير واضح بدون لافتات"},
    {"category_id": 4, "title": "Verdächtige Aktivität", "title_ar": "نشاط مشبوه",
     "description": "Ungewöhnliche Aktivität in der Gegend bemerkt", "description_ar": "لوحظ نشاط غير عادي في المنطقة"},
    
    # Utilities (Category 5)
    {"category_id": 5, "title": "Wasserleck", "title_ar": "تسرب مياه",
     "description": "Wasser tritt aus dem Boden aus", "description_ar": "تسرب مياه من الأرض"},
    {"category_id": 5, "title": "Stromausfall", "title_ar": "انقطاع كهرباء",
     "description": "Stromausfall in der Gegend", "description_ar": "انقطاع الكهرباء في المنطقة"},
    {"category_id": 5, "title": "Gasgeruch", "title_ar": "رائحة غاز",
     "description": "Gasgeruch in der Nähe wahrgenommen", "description_ar": "رائحة غاز ملحوظة في المنطقة"},
]

# Severity levels
SEVERITIES = [1, 2, 3, 4, 5]  # 1=Low, 5=Critical


def add_random_offset(lat: float, lon: float, max_offset: float = 0.005) -> tuple:
    """Add random offset to coordinates for variety"""
    lat_offset = random.uniform(-max_offset, max_offset)
    lon_offset = random.uniform(-max_offset, max_offset)
    return lat + lat_offset, lon + lon_offset


def get_auth_token(email: str, password: str) -> str:
    """Get authentication token"""
    response = requests.post(
        f"{API_BASE_URL}/api/auth/token",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    else:
        print(f"Failed to get token: {response.text}")
        return None


def create_report(token: str, report_data: dict) -> dict:
    """Create a new report via API"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    response = requests.post(
        f"{API_BASE_URL}/api/reports/",
        json=report_data,
        headers=headers
    )
    if response.status_code in [200, 201]:
        return response.json()
    else:
        print(f"Failed to create report: {response.status_code} - {response.text}")
        return None


def main():
    print("🚀 Starting Hamburg Reports Seeder...")
    print(f"📍 API: {API_BASE_URL}")
    
    # Get auth token (use admin or test user)
    print("\n🔐 Getting authentication token...")
    token = get_auth_token("admin@kashif.com", "admin123")
    
    if not token:
        print("❌ Failed to authenticate. Trying test user...")
        token = get_auth_token("test@example.com", "test123")
    
    if not token:
        print("❌ Could not authenticate. Please check credentials.")
        return
    
    print("✅ Authenticated successfully!")
    
    # Create reports
    created_count = 0
    total_reports = 50  # Number of reports to create
    
    print(f"\n📝 Creating {total_reports} reports in Hamburg...")
    
    for i in range(total_reports):
        # Random location
        location = random.choice(HAMBURG_LOCATIONS)
        lat, lon = add_random_offset(location["lat"], location["lon"])
        
        # Random report template
        template = random.choice(REPORT_TEMPLATES)
        
        # Create report data
        report_data = {
            "latitude": round(lat, 6),
            "longitude": round(lon, 6),
            "category_id": template["category_id"],
            "severity_id": random.choice(SEVERITIES),
            "title": template["title"],
            "description": f"{template['description']} - {location['area']}",
            "address_text": f"{location['area']}, Hamburg, Germany",
        }
        
        result = create_report(token, report_data)
        
        if result:
            created_count += 1
            print(f"  ✅ [{created_count}/{total_reports}] Created: {template['title']} in {location['area']}")
        else:
            print(f"  ❌ Failed to create report {i+1}")
        
        # Small delay to avoid overwhelming the API
        import time
        time.sleep(0.2)
    
    print(f"\n🎉 Done! Created {created_count}/{total_reports} reports in Hamburg.")


if __name__ == "__main__":
    main()
