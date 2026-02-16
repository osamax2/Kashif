-- Migration: Add notification preferences table and bilingual notification columns
-- Run inside kashif_notifications database

-- 1. Create notification preferences table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    user_id INTEGER PRIMARY KEY,
    report_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    status_updates BOOLEAN NOT NULL DEFAULT TRUE,
    points_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    coupon_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    general_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    quiet_hours_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    quiet_hours_start INTEGER DEFAULT 22,
    quiet_hours_end INTEGER DEFAULT 7
);

-- 2. Add bilingual columns to notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title_en VARCHAR(150);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS body_en TEXT;

-- 3. Drop old user_notification_status table if it exists
DROP TABLE IF EXISTS user_notification_status;
