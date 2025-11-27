#!/bin/bash
# Manual Deployment Script - Run this ON THE SERVER after uploading files
# ssh root@178.63.45.250
# Then run this script

set -e

echo "=================================================="
echo "  Installing Language Support Feature"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

cd /root/Kashif_backend/Kashif/Backend/auth-service

# Step 1: Backup current files
echo -e "${YELLOW}Step 1: Creating backup...${NC}"
mkdir -p backups
cp models.py backups/models.py.backup 2>/dev/null || true
cp schemas.py backups/schemas.py.backup 2>/dev/null || true
cp crud.py backups/crud.py.backup 2>/dev/null || true
cp main.py backups/main.py.backup 2>/dev/null || true
echo -e "${GREEN}✓ Backup created${NC}"
echo ""

# Step 2: Run database migration
echo -e "${YELLOW}Step 2: Running database migration...${NC}"
docker exec -i postgres_container psql -U kashif -d auth_db << 'EOF'
-- Add language column
ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(2) DEFAULT 'ar' NOT NULL;

-- Set default for existing users
UPDATE users SET language = 'ar' WHERE language IS NULL OR language = '';

-- Add index
CREATE INDEX IF NOT EXISTS idx_users_language ON users(language);

-- Verify
SELECT COUNT(*) as total_users, language FROM users GROUP BY language;

\q
EOF

echo -e "${GREEN}✓ Database migration completed${NC}"
echo ""

# Step 3: Verify database changes
echo -e "${YELLOW}Step 3: Verifying database changes...${NC}"
docker exec -it postgres_container psql -U kashif -d auth_db -c "\d users" | grep language
echo -e "${GREEN}✓ Language column exists${NC}"
echo ""

# Step 4: Restart auth service
echo -e "${YELLOW}Step 4: Restarting auth service...${NC}"
cd /root/Kashif/Backend
docker-compose restart auth-service

echo "Waiting for service to start..."
sleep 5

# Check if service is running
if docker-compose ps auth-service | grep -q "Up"; then
    echo -e "${GREEN}✓ Auth service is running${NC}"
else
    echo -e "${RED}✗ Auth service failed to start${NC}"
    echo "Checking logs:"
    docker-compose logs --tail=20 auth-service
    exit 1
fi
echo ""

# Step 5: Test endpoints
echo -e "${YELLOW}Step 5: Testing endpoints...${NC}"
HEALTH=$(curl -s http://localhost:8001/health)
echo "Health check: $HEALTH"

if echo "$HEALTH" | grep -q "healthy"; then
    echo -e "${GREEN}✓ Service is healthy${NC}"
else
    echo -e "${RED}✗ Service health check failed${NC}"
    exit 1
fi
echo ""

# Step 6: Show service status
echo -e "${YELLOW}Step 6: Service status...${NC}"
docker-compose ps auth-service
echo ""

echo -e "${GREEN}=================================================="
echo "  Deployment Complete!"
echo "==================================================${NC}"
echo ""
echo "New endpoints available:"
echo "  • PATCH /me/language - Update language preference"
echo "  • GET /me - Now includes 'language' field"
echo ""
echo "To test:"
echo "  curl -X PATCH http://localhost:8001/me/language \\"
echo "    -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"language\": \"en\"}'"
echo ""
