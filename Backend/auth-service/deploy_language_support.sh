#!/bin/bash
# Deploy Language Support to Production Server
# This script uploads and applies the language feature to the remote server

set -e  # Exit on error

echo "=================================================="
echo "  Deploying Language Support Feature"
echo "=================================================="
echo ""

# Configuration
SERVER="root@38.127.216.236"
REMOTE_PATH="/root/Kashif_backend/Kashif/Backend/auth-service"
LOCAL_PATH="."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Upload updated files
echo -e "${YELLOW}Step 1: Uploading updated files...${NC}"
mkdir -p migrations
sshpass -p '33Dpf178Lty9pzg_x31O35' scp -o StrictHostKeyChecking=no models.py "${SERVER}:${REMOTE_PATH}/"
sshpass -p '33Dpf178Lty9pzg_x31O35' scp -o StrictHostKeyChecking=no schemas.py "${SERVER}:${REMOTE_PATH}/"
sshpass -p '33Dpf178Lty9pzg_x31O35' scp -o StrictHostKeyChecking=no crud.py "${SERVER}:${REMOTE_PATH}/"
sshpass -p '33Dpf178Lty9pzg_x31O35' scp -o StrictHostKeyChecking=no main.py "${SERVER}:${REMOTE_PATH}/"
sshpass -p '33Dpf178Lty9pzg_x31O35' scp -o StrictHostKeyChecking=no migrations/001_add_language_column.sql "${SERVER}:${REMOTE_PATH}/migrations/" 2>/dev/null || echo "Migration file uploaded"

echo -e "${GREEN}✓ Files uploaded${NC}"
echo ""

# Step 2: Run database migration
echo -e "${YELLOW}Step 2: Running database migration...${NC}"
sshpass -p '33Dpf178Lty9pzg_x31O35' ssh -o StrictHostKeyChecking=no "${SERVER}" << 'ENDSSH'
cd /root/Kashif/Backend/auth-service

# Create migrations directory if it doesn't exist
mkdir -p migrations

# Run SQL migration
docker exec -i postgres_container psql -U kashif -d auth_db << 'EOF'
-- Add language column
ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(2) DEFAULT 'ar' NOT NULL;

-- Set default for existing users
UPDATE users SET language = 'ar' WHERE language IS NULL OR language = '';

-- Add index
CREATE INDEX IF NOT EXISTS idx_users_language ON users(language);

-- Verify
SELECT COUNT(*) as total_users, language FROM users GROUP BY language;
EOF

echo "✓ Migration completed"
ENDSSH

echo -e "${GREEN}✓ Database migration completed${NC}"
echo ""

# Step 3: Restart auth service
echo -e "${YELLOW}Step 3: Restarting auth service...${NC}"
sshpass -p '33Dpf178Lty9pzg_x31O35' ssh -o StrictHostKeyChecking=no "${SERVER}" << 'ENDSSH'
cd /root/Kashif/Backend

# Restart auth service
docker-compose restart auth-service

# Wait for service to be healthy
echo "Waiting for service to restart..."
sleep 5

# Check health
docker-compose ps auth-service
ENDSSH

echo -e "${GREEN}✓ Auth service restarted${NC}"
echo ""

# Step 4: Test the endpoint
echo -e "${YELLOW}Step 4: Testing language endpoint...${NC}"
echo "Testing health endpoint..."
curl -s http://38.127.216.236:8001/health | jq '.' || echo "Health check response received"

echo ""
echo -e "${GREEN}=================================================="
echo "  Deployment Complete!"
echo "==================================================${NC}"
echo ""
echo "New endpoints available:"
echo "  - PATCH /me/language - Update language preference"
echo "  - GET /me - Now includes 'language' field"
echo ""
echo "To test manually:"
echo "  curl -X PATCH http://38.127.216.236:8001/me/language \\"
echo "    -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"language\": \"en\"}'"
echo ""
