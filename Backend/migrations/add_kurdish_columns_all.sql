-- =====================================================
-- Consolidated Migration: Add Kurdish (ku) columns
-- to all service databases
-- Run this on each respective database
-- =====================================================

-- =====================================================
-- 1. AUTH SERVICE DATABASE (auth_db)
-- =====================================================
-- Terms of Service table
ALTER TABLE terms_of_service ADD COLUMN IF NOT EXISTS title_ku VARCHAR(255);
ALTER TABLE terms_of_service ADD COLUMN IF NOT EXISTS content_ku TEXT;

-- =====================================================
-- 2. GAMIFICATION SERVICE DATABASE (gamification_db)
-- =====================================================
-- Achievements table
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS name_ku VARCHAR(100);
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS description_ku TEXT;

-- Weekly Challenges table
ALTER TABLE weekly_challenges ADD COLUMN IF NOT EXISTS title_ku VARCHAR(200);
ALTER TABLE weekly_challenges ADD COLUMN IF NOT EXISTS description_ku VARCHAR(500);

-- =====================================================
-- 3. NOTIFICATION SERVICE DATABASE (notification_db)
-- =====================================================
-- Notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title_ku VARCHAR(150);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS body_ku TEXT;

-- =====================================================
-- 4. REPORTING SERVICE DATABASE (reporting_db)
-- =====================================================
-- Report categories table (may already exist)
ALTER TABLE report_categories ADD COLUMN IF NOT EXISTS name_ku VARCHAR(100);

-- =====================================================
-- VERIFICATION: Check all columns exist
-- =====================================================
-- Run these SELECT queries to verify:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'terms_of_service' AND column_name LIKE '%_ku';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'achievements' AND column_name LIKE '%_ku';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'weekly_challenges' AND column_name LIKE '%_ku';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'notifications' AND column_name LIKE '%_ku';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'report_categories' AND column_name LIKE '%_ku';
