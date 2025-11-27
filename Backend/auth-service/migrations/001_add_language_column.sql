-- Migration: Add language column to users table
-- Date: 2025-11-27
-- Description: Adds language preference support (ar/en) for multi-language UI

-- Add language column with default 'ar' (Arabic)
ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(2) DEFAULT 'ar' NOT NULL;

-- Set language to 'ar' for all existing users
UPDATE users SET language = 'ar' WHERE language IS NULL;

-- Verify migration
SELECT 
    id, 
    email, 
    full_name,
    language,
    created_at 
FROM users 
LIMIT 10;

-- Add index for potential future queries
CREATE INDEX IF NOT EXISTS idx_users_language ON users(language);

COMMIT;
