"""
Seed data script to populate lookup tables with initial data
"""
import psycopg2
from datetime import datetime

# Database connections
DB_CONFIGS = {
    'auth': {
        'dbname': 'auth_db',
        'user': 'kashif_user',
        'password': 'kashif_password',
        'host': 'kashif-auth-db',
        'port': 5432
    },
    'reporting': {
        'dbname': 'reporting_db',
        'user': 'kashif_user',
        'password': 'kashif_password',
        'host': 'kashif-reporting-db',
        'port': 5432
    },
    'coupons': {
        'dbname': 'coupons_db',
        'user': 'kashif_user',
        'password': 'kashif_password',
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


if __name__ == "__main__":
    print("\n🌱 Seeding database with initial data...\n")
    
    seed_levels()
    seed_categories()
    seed_report_statuses()
    seed_severities()
    seed_coupon_categories()
    
    print("\n✅ Database seeding completed!\n")
