-- Migration: Add confirmation system to reports
-- Date: 2025-12-20
-- Purpose: Implement report validation system to prevent fake/single-user reports

-- Add new columns to reports table
ALTER TABLE reports 
ADD COLUMN IF NOT EXISTS confirmation_status VARCHAR(20) DEFAULT 'confirmed' NOT NULL,
ADD COLUMN IF NOT EXISTS confirmed_by_user_id INTEGER,
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS points_awarded BOOLEAN DEFAULT FALSE NOT NULL;

-- Create index for confirmation_status for faster queries
CREATE INDEX IF NOT EXISTS idx_reports_confirmation_status ON reports(confirmation_status);

-- Create report_confirmations table
CREATE TABLE IF NOT EXISTS report_confirmations (
    id SERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    confirmation_type VARCHAR(30) NOT NULL,
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    points_awarded BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for report_confirmations
CREATE INDEX IF NOT EXISTS idx_report_confirmations_report_id ON report_confirmations(report_id);
CREATE INDEX IF NOT EXISTS idx_report_confirmations_user_id ON report_confirmations(user_id);

-- Set all existing reports to 'confirmed' status (grandfather them in)
UPDATE reports SET confirmation_status = 'confirmed' WHERE confirmation_status IS NULL OR confirmation_status = '';

-- Comment on new columns
COMMENT ON COLUMN reports.confirmation_status IS 'pending, confirmed, or expired - Reports need confirmation from another user';
COMMENT ON COLUMN reports.confirmed_by_user_id IS 'User ID who confirmed this report';
COMMENT ON COLUMN reports.confirmed_at IS 'Timestamp when the report was confirmed';
COMMENT ON COLUMN reports.points_awarded IS 'Whether points have been awarded for this report';
COMMENT ON TABLE report_confirmations IS 'Tracks all confirmations/verifications of reports by other users';
