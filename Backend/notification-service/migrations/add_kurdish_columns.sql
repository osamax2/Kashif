-- Migration: Add Kurdish (ku) columns to notifications table
-- Run inside kashif_notifications database

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title_ku VARCHAR(150);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS body_ku TEXT;
