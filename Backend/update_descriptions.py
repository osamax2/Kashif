#!/usr/bin/env python3
"""
Script to update report descriptions with AI-generated content based on ai_detections
"""
import psycopg2
import json
from datetime import datetime

# Database connection
conn = psycopg2.connect(
    host="reporting-db",
    database="kashif_reports",
    user="kashif_reports",
    password="report123"
)

def generate_arabic_description(detections, filename):
    """Generate Arabic description from AI detections"""
    if not detections:
        return None, None
    
    try:
        detection_list = json.loads(detections) if isinstance(detections, str) else detections
    except:
        return None, None
    
    if not detection_list:
        return None, None
    
    num_potholes = len(detection_list)
    
    # Calculate max severity
    severities = [d.get('severity', 'MEDIUM') for d in detection_list]
    if 'HIGH' in severities:
        max_severity = 'عالية'
        severity_id = 3
    elif 'MEDIUM' in severities:
        max_severity = 'متوسطة'
        severity_id = 2
    else:
        max_severity = 'منخفضة'
        severity_id = 1
    
    # Generate title
    title = f"🚧 {num_potholes} حفرة - خطورة {max_severity}"
    
    # Generate description
    description_parts = [
        f"🔍 تم الكشف التلقائي عن {num_potholes} حفرة/حفر في الطريق",
        "",
        "📊 تفاصيل الحفر:"
    ]
    
    for i, detection in enumerate(detection_list, 1):
        width = detection.get('estimated_width_cm', 0)
        height = detection.get('estimated_height_cm', 0)
        depth = detection.get('estimated_depth_cm', 0)
        severity = detection.get('severity', 'UNKNOWN')
        
        severity_ar = {'HIGH': 'HIGH', 'MEDIUM': 'MEDIUM', 'LOW': 'LOW'}.get(severity, severity)
        
        description_parts.append(
            f"حفرة {i}: العرض {width:.1f} سم، الطول {height:.1f} سم، العمق التقديري {depth:.1f} سم، الخطورة: {severity_ar}"
        )
    
    # Add metadata
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    description_parts.extend([
        "",
        f"📅 تاريخ الالتقاط: {now}",
        f"📁 الملف الأصلي: {filename}",
        "",
        "⚠️ تم إنشاء هذا التقرير تلقائياً بواسطة نظام الكشف الذكي (YOLOv8)"
    ])
    
    description = "\n".join(description_parts)
    
    return title, description, severity_id

def main():
    cursor = conn.cursor()
    
    # Get all reports with ai_detections but without proper Arabic description
    cursor.execute("""
        SELECT id, title, ai_detections, photo_urls 
        FROM reports 
        WHERE ai_detections IS NOT NULL 
        AND description NOT LIKE '%🔍%'
        AND id BETWEEN 375 AND 418
        ORDER BY id
    """)
    
    reports = cursor.fetchall()
    print(f"Found {len(reports)} reports to update")
    
    updated = 0
    for report_id, old_title, ai_detections, photo_urls in reports:
        # Extract filename from photo_urls or title
        if photo_urls:
            filename = photo_urls.split('/')[-1]
        else:
            filename = old_title.replace('Schlagloch ', '') if old_title else 'unknown.jpg'
        
        result = generate_arabic_description(ai_detections, filename)
        if result and result[0]:
            new_title, new_description, severity_id = result
            
            cursor.execute("""
                UPDATE reports 
                SET title = %s, description = %s, severity_id = %s
                WHERE id = %s
            """, (new_title, new_description, severity_id, report_id))
            
            print(f"[{report_id}] Updated: {new_title[:50]}...")
            updated += 1
    
    conn.commit()
    print(f"\nUpdated {updated} reports!")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    main()
