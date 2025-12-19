import random
from datetime import datetime, timedelta

import psycopg2

# Database connections
connections = {
    'reports': {
        'host': 'reporting-db',
        'port': 5432,
        'database': 'kashif_reports',
        'user': 'kashif_reports',
        'password': 'report123'
    },
    'coupons': {
        'host': 'coupons-db',
        'port': 5432,
        'database': 'kashif_coupons',
        'user': 'kashif_coupons',
        'password': 'coupon123'
    }
}

def seed_reports():
    """Seed sample reports data"""
    conn = psycopg2.connect(**connections['reports'])
    cur = conn.cursor()
    
    # Create tables if not exist (from models)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS categories (
            id SERIAL PRIMARY KEY,
            name_en VARCHAR(100),
            name_ar VARCHAR(100),
            description TEXT
        );
        
        CREATE TABLE IF NOT EXISTS report_statuses (
            id SERIAL PRIMARY KEY,
            name VARCHAR(50) UNIQUE,
            description TEXT
        );
        
        CREATE TABLE IF NOT EXISTS severities (
            id SERIAL PRIMARY KEY,
            category_id INT REFERENCES categories(id),
            level INT,
            name_en VARCHAR(100),
            name_ar VARCHAR(100)
        );
        
        CREATE TABLE IF NOT EXISTS reports (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL,
            category_id INT REFERENCES categories(id),
            status_id INT REFERENCES report_statuses(id),
            severity_id INT REFERENCES severities(id),
            description TEXT,
            latitude DOUBLE PRECISION,
            longitude DOUBLE PRECISION,
            image_url TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
    """)
    
    # Insert categories
    categories = [
        ('Infrastructure', 'Infrastructure', 'البنية التحتية', 'Roads, bridges, public facilities'),
        ('Environment', 'Environment', 'البيئة', 'Pollution, waste management'),
        ('Safety', 'Safety', 'السلامة', 'Public safety concerns')
    ]
    
    for cat in categories:
        cur.execute(
            "INSERT INTO categories (name, name_en, name_ar, description) VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING",
            cat
        )
    
    # Insert statuses
    statuses = [
        ('NEW', 'New report'),
        ('IN_PROGRESS', 'Being handled'),
        ('RESOLVED', 'Issue resolved'),
        ('REJECTED', 'Report rejected')
    ]
    
    for status in statuses:
        cur.execute(
            "INSERT INTO report_statuses (name, description) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            status
        )
    
    # Get IDs
    cur.execute("SELECT id FROM categories")
    category_ids = [row[0] for row in cur.fetchall()]
    
    cur.execute("SELECT id FROM report_statuses")
    status_ids = [row[0] for row in cur.fetchall()]
    
    # Insert sample reports
    descriptions = [
        'Pothole on main street needs repair',
        'Broken street light at intersection',
        'Illegal dumping site',
        'Damaged playground equipment',
        'Water leak on sidewalk'
    ]
    
    riyadh_lat, riyadh_lon = 24.7136, 46.6753
    
    for i in range(10):
        lat = riyadh_lat + random.uniform(-0.1, 0.1)
        lon = riyadh_lon + random.uniform(-0.1, 0.1)
        
        cur.execute("""
            INSERT INTO reports (user_id, category_id, status_id, description, latitude, longitude, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            random.randint(1, 3),
            random.choice(category_ids),
            random.choice(status_ids),
            random.choice(descriptions),
            lat,
            lon,
            datetime.now() - timedelta(days=random.randint(0, 30))
        ))
    
    conn.commit()
    cur.close()
    conn.close()
    print("✓ Reports data seeded")

def seed_coupons():
    """Seed sample coupons data"""
    conn = psycopg2.connect(**connections['coupons'])
    cur = conn.cursor()
    
    # Create tables
    cur.execute("""
        CREATE TABLE IF NOT EXISTS companies (
            id SERIAL PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            description TEXT,
            logo_url TEXT,
            website TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS coupon_categories (
            id SERIAL PRIMARY KEY,
            name_en VARCHAR(100),
            name_ar VARCHAR(100),
            icon TEXT
        );
        
        CREATE TABLE IF NOT EXISTS coupons (
            id SERIAL PRIMARY KEY,
            company_id INT REFERENCES companies(id),
            category_id INT REFERENCES coupon_categories(id),
            title_en VARCHAR(200),
            title_ar VARCHAR(200),
            description_en TEXT,
            description_ar TEXT,
            code VARCHAR(50),
            discount_percentage INT,
            points_required INT,
            max_redemptions INT DEFAULT 100,
            current_redemptions INT DEFAULT 0,
            expires_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
        );
    """)
    
    # Insert companies
    companies = [
        ('Starbucks', 'Coffee chain', None, 'https://starbucks.com'),
        ("McDonald's", 'Fast food', None, 'https://mcdonalds.com'),
        ('Jarir Bookstore', 'Books and electronics', None, 'https://jarir.com')
    ]
    
    for company in companies:
        cur.execute(
            "INSERT INTO companies (name, description, logo_url, website_url, status, created_at) VALUES (%s, %s, %s, %s, 'ACTIVE', NOW())",
            company
        )
    
    # Insert categories
    categories = [
        ('Food & Beverage', 'طعام ومشروبات', '🍔'),
        ('Shopping', 'تسوق', '🛍️'),
        ('Entertainment', 'ترفيه', '🎭')
    ]
    
    for cat in categories:
        cur.execute(
            "INSERT INTO coupon_categories (name_en, name_ar, icon) VALUES (%s, %s, %s)",
            cat
        )
    
    # Get IDs
    cur.execute("SELECT id FROM companies")
    company_ids = [row[0] for row in cur.fetchall()]
    
    cur.execute("SELECT id FROM coupon_categories")
    category_ids = [row[0] for row in cur.fetchall()]
    
    # Insert coupons
    coupon_templates = [
        ('20% Off Any Purchase', 'خصم 20%', 'Get 20% off your next purchase', 'احصل على خصم 20%'),
        ('Buy One Get One Free', 'اشتري واحد واحصل على الثاني مجانا', 'BOGO offer', 'عرض اشتري واحد واحصل على الثاني مجانا'),
        ('Free Delivery', 'توصيل مجاني', 'Free delivery on orders', 'توصيل مجاني على الطلبات'),
        ('30% Discount', 'خصم 30%', 'Special 30% discount', 'خصم خاص 30%'),
        ('SR 50 Off', 'خصم 50 ريال', 'Get SR 50 off', 'احصل على خصم 50 ريال')
    ]
    
    for i in range(15):
        template = random.choice(coupon_templates)
        cur.execute("""
            INSERT INTO coupons (
                company_id, category_id, title_en, title_ar, 
                description_en, description_ar, code, 
                discount_percentage, points_required, 
                max_redemptions, current_redemptions, expires_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            random.choice(company_ids),
            random.choice(category_ids),
            template[0],
            template[1],
            template[2],
            template[3],
            f'CODE{random.randint(1000, 9999)}',
            random.choice([10, 15, 20, 25, 30]),
            random.randint(50, 500),
            100,
            random.randint(0, 50),
            datetime.now() + timedelta(days=random.randint(30, 180))
        ))
    
    conn.commit()
    cur.close()
    conn.close()
    print("✓ Coupons data seeded")

if __name__ == '__main__':
    print("Seeding backend databases...")
    try:
        seed_reports()
    except Exception as e:
        print(f"✗ Reports seeding failed: {e}")
    
    try:
        seed_coupons()
    except Exception as e:
        print(f"✗ Coupons seeding failed: {e}")
    
    print("Done!")
    print("Done!")
