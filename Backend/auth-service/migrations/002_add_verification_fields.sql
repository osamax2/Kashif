-- Migration: Add account verification and password change fields
-- Date: 2024-12-21

-- Add is_verified column (default FALSE for new users, TRUE for existing users)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT TRUE;

-- Add must_change_password column (default FALSE)
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

-- Update existing users to be verified (they were created before this feature)
UPDATE users SET is_verified = TRUE WHERE is_verified IS NULL;

-- For new registrations, set default to FALSE (not verified)
-- This is handled in application code, but we set TRUE as default for existing users
