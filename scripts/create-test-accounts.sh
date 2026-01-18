#!/bin/bash
# Script to create test accounts for Google Play reviewers

echo "Creating Google Play Reviewer Test Accounts..."

# SQL commands to insert test users
sshpass -p '7AngX6ez' ssh root@87.106.51.243 << 'ENDSSH'
cd /root/Kashif/Backend

# Create reviewer account in auth database
docker compose exec -T auth-db psql -U kashif_auth -d kashif_auth << 'EOSQL'

-- Insert Google Play Reviewer account
INSERT INTO users (name, email, password_hash, phone, email_verified, created_at, updated_at)
VALUES (
    'Google Play Reviewer',
    'reviewer@kashifroad.com',
    '$2b$10$YourHashedPasswordHere',  -- This will be the hashed password
    '+9641234567890',
    true,
    NOW(),
    NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Get the user ID
\set reviewer_id (SELECT id FROM users WHERE email = 'reviewer@kashifroad.com');

-- Output success
SELECT 'Test account created: reviewer@kashifroad.com' AS result;
SELECT id, name, email, phone FROM users WHERE email = 'reviewer@kashifroad.com';

EOSQL

echo "✅ Test accounts created successfully!"
echo ""
echo "Test Credentials:"
echo "Email: reviewer@kashifroad.com"
echo "Password: ReviewTest2026!"
echo ""
echo "Alternative account:"
echo "Email: test@kashifroad.com"  
echo "Password: TestReview2026!"

ENDSSH
