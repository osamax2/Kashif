"""
Seed data script to populate lookup tables with initial data
"""
from datetime import datetime, timedelta

import psycopg2

# Database connections
DB_CONFIGS = {
    'auth': {
        'dbname': 'kashif_auth',
        'user': 'kashif_auth',
        'password': 'auth123',
        'host': 'kashif-auth-db',
        'port': 5432
    },
    'reporting': {
        'dbname': 'kashif_reports',
        'user': 'kashif_reports',
        'password': 'report123',
        'host': 'kashif-reporting-db',
        'port': 5432
    },
    'coupons': {
        'dbname': 'kashif_coupons',
        'user': 'kashif_coupons',
        'password': 'coupon123',
        'host': 'kashif-coupons-db',
        'port': 5432
    }
}


def seed_levels():
    """Seed Levels table in auth database"""
    conn = psycopg2.connect(**DB_CONFIGS['auth'])
    cur = conn.cursor()
    
    levels = [
        (1, 'Bronze', 0),
        (2, 'Silver', 10),
        (3, 'Gold', 50),
        (4, 'Platinum', 100),
        (5, 'Diamond', 200)
    ]
    
    try:
        for level in levels:
            cur.execute("""
                INSERT INTO levels (id, name, min_report_number) 
                VALUES (%s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """, level)
        
        conn.commit()
        print("✓ Levels seeded successfully")
    except Exception as e:
        print(f"✗ Error seeding levels: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()


def seed_categories():
    """Seed Categories table in reporting database"""
    conn = psycopg2.connect(**DB_CONFIGS['reporting'])
    cur = conn.cursor()
    
    categories = [
        (1, 'Infrastructure', 'Roads, bridges, and public infrastructure issues'),
        (2, 'Environment', 'Environmental concerns and pollution'),
        (3, 'Public Safety', 'Safety hazards and security issues'),
        (4, 'Public Services', 'Issues with public services'),
        (5, 'Other', 'Other community issues')
    ]
    
    try:
        for category in categories:
            cur.execute("""
                INSERT INTO categories (id, name, description) 
                VALUES (%s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """, category)
        
        conn.commit()
        print("✓ Categories seeded successfully")
    except Exception as e:
        print(f"✗ Error seeding categories: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()


def seed_report_statuses():
    """Seed Report Statuses table in reporting database"""
    conn = psycopg2.connect(**DB_CONFIGS['reporting'])
    cur = conn.cursor()
    
    statuses = [
        (1, 'NEW', 'Report has been submitted and is awaiting review'),
        (2, 'IN_PROGRESS', 'Report is being investigated or worked on'),
        (3, 'RESOLVED', 'Report has been resolved'),
        (4, 'REJECTED', 'Report was rejected or deemed invalid'),
        (5, 'CLOSED', 'Report has been closed')
    ]
    
    try:
        for status in statuses:
            cur.execute("""
                INSERT INTO report_statuses (id, name, description) 
                VALUES (%s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """, status)
        
        conn.commit()
        print("✓ Report Statuses seeded successfully")
    except Exception as e:
        print(f"✗ Error seeding report statuses: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()


def seed_severities():
    """Seed Severities table in reporting database"""
    conn = psycopg2.connect(**DB_CONFIGS['reporting'])
    cur = conn.cursor()
    
    severities = [
        (1, 'LOW', 'Minor issue with minimal impact', 1),
        (2, 'MEDIUM', 'Moderate issue requiring attention', 1),
        (3, 'HIGH', 'Serious issue requiring immediate attention', 1),
        (4, 'LOW', 'Minor environmental concern', 2),
        (5, 'MEDIUM', 'Moderate environmental issue', 2),
        (6, 'HIGH', 'Critical environmental hazard', 2),
        (7, 'LOW', 'Minor safety concern', 3),
        (8, 'MEDIUM', 'Moderate safety issue', 3),
        (9, 'HIGH', 'Critical safety hazard', 3),
        (10, 'LOW', 'Minor service issue', 4),
        (11, 'MEDIUM', 'Moderate service disruption', 4),
        (12, 'HIGH', 'Major service failure', 4),
        (13, 'LOW', 'Minor other issue', 5),
        (14, 'MEDIUM', 'Moderate other issue', 5),
        (15, 'HIGH', 'Critical other issue', 5)
    ]
    
    try:
        for severity in severities:
            cur.execute("""
                INSERT INTO severities (id, name, description, category_id) 
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """, severity)
        
        conn.commit()
        print("✓ Severities seeded successfully")
    except Exception as e:
        print(f"✗ Error seeding severities: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()


def seed_coupon_categories():
    """Seed Coupon Categories table in coupons database"""
    conn = psycopg2.connect(**DB_CONFIGS['coupons'])
    cur = conn.cursor()
    
    categories = [
        (1, 'Food & Dining', 'Restaurants and food services', 'restaurant', 1, datetime.now(), 'ACTIVE'),
        (2, 'Shopping', 'Retail and shopping discounts', 'shopping-bag', 2, datetime.now(), 'ACTIVE'),
        (3, 'Entertainment', 'Movies, events, and entertainment', 'ticket', 3, datetime.now(), 'ACTIVE'),
        (4, 'Travel', 'Hotels, flights, and travel services', 'airplane', 4, datetime.now(), 'ACTIVE'),
        (5, 'Health & Wellness', 'Gyms, spas, and health services', 'heart', 5, datetime.now(), 'ACTIVE'),
        (6, 'Education', 'Courses, books, and educational resources', 'book', 6, datetime.now(), 'ACTIVE')
    ]
    
    try:
        for category in categories:
            cur.execute("""
                INSERT INTO coupon_categories (id, name, description, icon_name, sort_order, created_at, status) 
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """, category)
        
        conn.commit()
        print("✓ Coupon Categories seeded successfully")
    except Exception as e:
        print(f"✗ Error seeding coupon categories: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()


def seed_coupon_companies():
    """Seed Companies table in coupons database"""
    conn = psycopg2.connect(**DB_CONFIGS['coupons'])
    cur = conn.cursor()

    now = datetime.utcnow()
    companies = [
        (1, 'RoadStop Cafe', 'Specialty coffee stops for drivers on the go.',
         'https://images.pexels.com/photos/3184183/pexels-photo-3184183.jpeg',
         'https://roadstop.example.com', '+966 500 000 111', 'Riyadh, Saudi Arabia', 'ACTIVE', now),
        (2, 'QuickShine Car Wash', 'Express detailing and car wash services across the kingdom.',
         'https://images.pexels.com/photos/9796/car-vehicle-vintage-blue.jpg',
         'https://quickshine.example.com', '+966 500 000 222', 'Jeddah, Saudi Arabia', 'ACTIVE', now),
        (3, 'AutoCare Plus', 'Certified maintenance and tire rotation workshops.',
         'https://images.pexels.com/photos/4489709/pexels-photo-4489709.jpeg',
         'https://autocareplus.example.com', '+966 500 000 333', 'Dammam, Saudi Arabia', 'ACTIVE', now)
    ]

    try:
        for company in companies:
            cur.execute(
                """
                INSERT INTO companies (id, name, description, logo_url, website_url, phone, address, status, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
                """,
                company,
            )

        conn.commit()
        print("✓ Coupon companies seeded successfully")
    except Exception as e:
        print(f"✗ Error seeding coupon companies: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()


def seed_coupons():
    """Seed Coupons table with sample data"""
    conn = psycopg2.connect(**DB_CONFIGS['coupons'])
    cur = conn.cursor()

    now = datetime.utcnow()
    coupons = [
        (1001, 1, 1, 'Free Coffee Upgrade',
         'Enjoy a complimentary upgrade to any specialty coffee size at RoadStop Cafe locations.',
         750, now + timedelta(days=45),
         'https://images.pexels.com/photos/977876/pexels-photo-977876.jpeg', 1, 250, 'ACTIVE', now),
        (1002, 2, 2, '50% Off Premium Wash',
         'Get 50% off a premium exterior wash at participating QuickShine Car Wash branches.',
         1200, now + timedelta(days=14),
         'https://images.pexels.com/photos/899239/pexels-photo-899239.jpeg', 2, 120, 'ACTIVE', now),
        (1003, 3, 5, '10% Off Tire Rotation',
         'Save 10% on wheel alignment and tire rotation services at AutoCare Plus workshops.',
         1800, now - timedelta(days=7),
         'https://images.pexels.com/photos/3804155/pexels-photo-3804155.jpeg', 1, 0, 'EXPIRED', now)
    ]

    try:
        for coupon in coupons:
            cur.execute(
                """
                INSERT INTO coupons (
                    id, company_id, coupon_category_id, name, description,
                    points_cost, expiration_date, image_url, max_usage_per_user,
                    total_available, status, created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
                """,
                coupon,
            )

        conn.commit()
        print("✓ Coupons seeded successfully")
    except Exception as e:
        print(f"✗ Error seeding coupons: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()


def seed_sample_reports():
    """Seed sample reports in the reporting database"""
    import random
    
    conn = psycopg2.connect(**DB_CONFIGS['reporting'])
    cur = conn.cursor()
    
    # Sample report data
    reports_data = [
        (1, 1, 1, 2, 'Pothole on King Fahd Road', 'Large pothole causing traffic issues', 24.7136, 46.6753, False, None),
        (2, 1, 2, 3, 'Broken Street Light', 'Street light not working at intersection', 24.7256, 46.6853, False, None),
        (1, 2, 1, 5, 'Illegal Dumping Site', 'Garbage dumped near residential area', 24.7036, 46.6653, False, None),
        (3, 2, 3, 4, 'Air Quality Issue', 'Excessive smoke from factory', 24.7336, 46.6953, False, None),
        (2, 3, 1, 8, 'Damaged Pedestrian Crossing', 'Faded crossing marks creating safety hazard', 24.7436, 46.7053, False, None),
        (1, 3, 2, 7, 'Missing Road Sign', 'Stop sign fallen down', 24.7536, 46.7153, False, None),
        (3, 1, 3, 1, 'Sidewalk Crack Repaired', 'Sidewalk has been fixed', 24.7636, 46.7253, False, None),
        (2, 4, 1, 10, 'Bus Stop Shelter Damaged', 'Glass broken at bus stop', 24.7736, 46.7353, False, None),
        (1, 1, 2, 3, 'Road Surface Deterioration', 'Multiple potholes on highway', 24.7836, 46.7453, False, None),
        (3, 2, 1, 4, 'Tree Trimming Needed', 'Overgrown trees blocking road signs', 24.7936, 46.7553, False, None),
        (2, 3, 3, 9, 'Unsafe Construction Site', 'Construction barriers moved creating danger', 24.8036, 46.7653, False, None),
        (1, 4, 1, 11, 'Streetlight Outage Cluster', 'Multiple streetlights out in neighborhood', 24.8136, 46.7753, False, None),
        (3, 1, 2, 2, 'Drainage System Blocked', 'Storm drain clogged causing flooding risk', 24.8236, 46.7853, False, None),
        (2, 2, 1, 6, 'Waste Container Overflowing', 'Public bin needs emptying urgently', 24.8336, 46.7953, False, None),
        (1, 5, 1, 13, 'Park Bench Vandalized', 'Graffiti on park furniture', 24.8436, 46.8053, False, None)
    ]
    
    try:
        # Insert reports with timestamps from the past 30 days
        for i, report_data in enumerate(reports_data):
            days_ago = random.randint(0, 30)
            created_at = datetime.now() - timedelta(days=days_ago)
            
            cur.execute("""
                INSERT INTO reports (
                    user_id, category_id, status_id, severity_id, title, description,
                    latitude, longitude, user_hide, photo_urls, created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
            """, (
                report_data[0], report_data[1], report_data[2], report_data[3],
                report_data[4], report_data[5], report_data[6], report_data[7],
                report_data[8], report_data[9], created_at, created_at
            ))
        
        conn.commit()
        print(f"✓ {len(reports_data)} sample reports seeded successfully")
    except Exception as e:
        print(f"✗ Error seeding sample reports: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()


def seed_admin_user():
    """Create an admin user in the auth database"""
    from passlib.context import CryptContext
    
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    conn = psycopg2.connect(**DB_CONFIGS['auth'])
    cur = conn.cursor()
    
    # Admin user details
    email = "admin@kashif.com"
    password = "Admin@123"  # Change this password after first login!
    hashed_password = pwd_context.hash(password)
    full_name = "System Administrator"
    phone = "+966500000000"
    
    try:
        # Check if admin user already exists
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        existing_user = cur.fetchone()
        
        if existing_user:
            # Update existing user to ADMIN role
            cur.execute("""
                UPDATE users 
                SET role = 'ADMIN',
                    status = 'ACTIVE',
                    updated_at = %s
                WHERE email = %s
                RETURNING id
            """, (datetime.now(), email))
            user_id = cur.fetchone()[0]
            print(f"✓ Existing user '{email}' updated to ADMIN role (ID: {user_id})")
        else:
            # Create new admin user
            cur.execute("""
                INSERT INTO users (
                    email, hashed_password, full_name, phone, 
                    role, status, level_id, total_points, 
                    language, created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                email, hashed_password, full_name, phone,
                'ADMIN', 'ACTIVE', 1, 0, 'ar',
                datetime.now(), datetime.now()
            ))
            user_id = cur.fetchone()[0]
            print(f"✓ Admin user created successfully (ID: {user_id})")
        
        conn.commit()
        print(f"  Email: {email}")
        print(f"  Password: {password}")
        print(f"  ⚠️  CHANGE THIS PASSWORD AFTER FIRST LOGIN!")
        
    except Exception as e:
        print(f"✗ Error creating admin user: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    print("\n🌱 Seeding database with initial data...\n")
    
    seed_levels()
    seed_categories()
    seed_report_statuses()
    seed_severities()
    seed_sample_reports()
    seed_coupon_categories()
    seed_coupon_companies()
    seed_coupons()
    seed_admin_user()
    
    print("\n✅ Database seeding completed!\n")
