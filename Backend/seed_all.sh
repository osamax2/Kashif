#!/bin/bash
# Seed all databases by running Python scripts inside each container

echo "🌱 Seeding all databases..."
echo ""

# Seed Auth Database (Levels)
echo "📊 Seeding Auth Database (Levels)..."
docker exec kashif-auth python -c "
from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text('''
        INSERT INTO levels (id, name, min_report_number) VALUES 
        (1, 'Bronze', 0),
        (2, 'Silver', 10),
        (3, 'Gold', 50),
        (4, 'Platinum', 100),
        (5, 'Diamond', 200)
        ON CONFLICT (id) DO NOTHING
    '''))
    conn.commit()
    print('✓ Levels seeded')
"

# Seed Reporting Database
echo ""
echo "📊 Seeding Reporting Database (Categories, Statuses, Severities)..."
docker exec kashif-reporting python -c "
from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Categories
    conn.execute(text('''
        INSERT INTO categories (id, name, description) VALUES 
        (1, 'Infrastructure', 'Roads, bridges, and public infrastructure issues'),
        (2, 'Environment', 'Environmental concerns and pollution'),
        (3, 'Public Safety', 'Safety hazards and security issues'),
        (4, 'Public Services', 'Issues with public services'),
        (5, 'Other', 'Other community issues')
        ON CONFLICT (id) DO NOTHING
    '''))
    
    # Report Statuses
    conn.execute(text('''
        INSERT INTO report_statuses (id, name, description) VALUES 
        (1, 'NEW', 'Report has been submitted and is awaiting review'),
        (2, 'IN_PROGRESS', 'Report is being investigated or worked on'),
        (3, 'RESOLVED', 'Report has been resolved'),
        (4, 'REJECTED', 'Report was rejected or deemed invalid'),
        (5, 'CLOSED', 'Report has been closed')
        ON CONFLICT (id) DO NOTHING
    '''))
    
    # Severities
    conn.execute(text('''
        INSERT INTO severities (id, name, description, category_id) VALUES 
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
        ON CONFLICT (id) DO NOTHING
    '''))
    
    conn.commit()
    print('✓ Categories, Statuses, and Severities seeded')
"

# Seed Coupons Database
echo ""
echo "📊 Seeding Coupons Database (Coupon Categories)..."
docker exec kashif-coupons python -c "
from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text('''
        INSERT INTO coupon_categories (id, name, description, icon_name, sort_order, status, created_at) VALUES 
        (1, 'Food & Dining', 'Restaurants and food services', 'restaurant', 1, 'ACTIVE', NOW()),
        (2, 'Shopping', 'Retail and shopping discounts', 'shopping-bag', 2, 'ACTIVE', NOW()),
        (3, 'Entertainment', 'Movies, events, and entertainment', 'ticket', 3, 'ACTIVE', NOW()),
        (4, 'Travel', 'Hotels, flights, and travel services', 'airplane', 4, 'ACTIVE', NOW()),
        (5, 'Health & Wellness', 'Gyms, spas, and health services', 'heart', 5, 'ACTIVE', NOW()),
        (6, 'Education', 'Courses, books, and educational resources', 'book', 6, 'ACTIVE', NOW())
        ON CONFLICT (id) DO NOTHING
    '''))
    conn.commit()
    print('✓ Coupon Categories seeded')
"

echo ""
echo "✅ All databases seeded successfully!"
