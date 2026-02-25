#!/usr/bin/env python3
"""
Update Report Categories with Arabic names and colors
Run this script to update the categories table in the reporting database
"""

import psycopg2
from psycopg2.extras import DictCursor

# Database connection for reporting service
DB_CONFIG = {
    'host': 'reporting-db',
    'port': 5432,
    'database': 'kashif_reports',
    'user': 'kashif_reports',
    'password': 'report123'
}

# Categories with Arabic names, English names, Kurdish names, colors, and descriptions
CATEGORIES = [
    {
        'name_ar': 'حفرة',
        'name_en': 'Pothole',
        'name_ku': 'Çal',
        'color': '#FFD700',  # Yellow/Gold
        'description': 'تقرير عن حفر في الطرق'
    },
    {
        'name_ar': 'حادث',
        'name_en': 'Accident',
        'name_ku': 'Qeza',
        'color': '#FF0000',  # Red
        'description': 'تقرير عن حوادث مرورية'
    },
    {
        'name_ar': 'كاشف السرعة',
        'name_en': 'Speed Camera',
        'name_ku': 'Kameraya Lezê',
        'color': '#00FF00',  # Green
        'description': 'تقرير عن مواقع كاشف السرعة'
    }
]


def update_categories():
    """Update or insert report categories with colors"""
    try:
        # Connect to database
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor(cursor_factory=DictCursor)
        
        print("🔗 Connected to reporting database")
        
        # Check if color column exists, if not add it
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='categories' AND column_name='color'
        """)
        
        if not cur.fetchone():
            print("➕ Adding 'color' column to categories table...")
            cur.execute("""
                ALTER TABLE categories 
                ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#808080'
            """)
            conn.commit()
            print("✅ Color column added")
        
        # Check if name_ar, name_en and name_ku columns exist
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='categories' AND column_name IN ('name_ar', 'name_en', 'name_ku')
        """)
        
        existing_columns = [row['column_name'] for row in cur.fetchall()]
        
        if 'name_ar' not in existing_columns:
            print("➕ Adding 'name_ar' column to categories table...")
            cur.execute("""
                ALTER TABLE categories 
                ADD COLUMN IF NOT EXISTS name_ar VARCHAR(100)
            """)
            conn.commit()
            print("✅ name_ar column added")
        
        if 'name_en' not in existing_columns:
            print("➕ Adding 'name_en' column to categories table...")
            cur.execute("""
                ALTER TABLE categories 
                ADD COLUMN IF NOT EXISTS name_en VARCHAR(100)
            """)
            # If 'name' column exists, copy data to name_en
            cur.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='categories' AND column_name='name'
            """)
            if cur.fetchone():
                cur.execute("UPDATE categories SET name_en = name WHERE name_en IS NULL")
            conn.commit()
            print("✅ name_en column added")
        
        if 'name_ku' not in existing_columns:
            print("➕ Adding 'name_ku' column to categories table...")
            cur.execute("""
                ALTER TABLE categories 
                ADD COLUMN IF NOT EXISTS name_ku VARCHAR(100)
            """)
            conn.commit()
            print("✅ name_ku column added")
        
        # Get existing categories
        cur.execute("SELECT id, name_en, name_ar FROM categories ORDER BY id")
        existing = cur.fetchall()
        
        print(f"\n📋 Found {len(existing)} existing categories:")
        for cat in existing:
            print(f"   ID {cat['id']}: {cat.get('name_en') or cat.get('name_ar', 'N/A')}")
        
        # Update or insert categories (keep IDs to preserve foreign keys)
        print("\n📝 Updating/Inserting categories:")
        for idx, cat in enumerate(CATEGORIES, start=1):
            # Check if category with this ID exists
            cur.execute("SELECT id FROM categories WHERE id = %s", (idx,))
            exists = cur.fetchone()
            
            if exists:
                # Update existing category
                cur.execute("""
                    UPDATE categories 
                    SET name_ar = %(name_ar)s, 
                        name_en = %(name_en)s, 
                        name_ku = %(name_ku)s,
                        color = %(color)s, 
                        description = %(description)s
                    WHERE id = %(id)s
                    RETURNING id
                """, {**cat, 'id': idx})
                print(f"   🔄 Updated ID {idx}: {cat['name_ar']} ({cat['name_en']}/{cat['name_ku']}) - {cat['color']}")
            else:
                # Insert new category with specific ID
                cur.execute("""
                    INSERT INTO categories (id, name_ar, name_en, name_ku, color, description)
                    VALUES (%(id)s, %(name_ar)s, %(name_en)s, %(name_ku)s, %(color)s, %(description)s)
                    RETURNING id
                """, {**cat, 'id': idx})
                print(f"   ✅ Inserted ID {idx}: {cat['name_ar']} ({cat['name_en']}/{cat['name_ku']}) - {cat['color']}")
        
        # Commit the updates first
        conn.commit()
        print("\n✅ Category updates committed")
        
        # Try to delete extra categories (IDs > 3) - but don't fail if we can't
        cur.execute("SELECT id FROM categories WHERE id > 3")
        extra_categories = cur.fetchall()
        if extra_categories:
            print("\n⚠️  Found extra categories (cannot delete due to foreign key constraints):")
            for cat in extra_categories:
                print(f"   ⚠️  ID {cat['id']} - keeping due to existing data")
        
        conn.commit()
        
        # Verify the update
        print("\n🔍 Verifying categories:")
        cur.execute("SELECT id, name_ar, name_en, name_ku, color, description FROM categories ORDER BY id")
        categories = cur.fetchall()
        
        for cat in categories:
            print(f"""
   📌 Category ID: {cat['id']}
      Arabic: {cat['name_ar']}
      English: {cat['name_en']}
      Kurdish: {cat.get('name_ku', 'N/A')}
      Color: {cat['color']}
      Description: {cat['description']}
            """)
        
        cur.close()
        conn.close()
        
        print("\n✅ Categories updated successfully!")
        print(f"✅ Total categories: {len(categories)}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error updating categories: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return False


if __name__ == '__main__':
    print("=" * 60)
    print("🔄 Updating Report Categories")
    print("=" * 60)
    
    success = update_categories()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ Update completed successfully!")
    else:
        print("❌ Update failed!")
    print("=" * 60)
