#!/bin/bash
# =====================================================
# Deploy Kurdish Language Support to Server
# Run from local machine
# =====================================================

SERVER="87.106.51.243"
SSH_PORT="2299"
SSH_CMD="ssh -p $SSH_PORT root@$SERVER"

echo "=== Deploying Kurdish Language Support ==="
echo ""

# Step 1: Pull latest code
echo ">>> Step 1: Pulling latest code on server..."
$SSH_CMD "cd /root/Kashif && git pull origin feature/Ku_feature"

# Step 2: Run database migrations for each service
echo ""
echo ">>> Step 2: Running database migrations..."

# Auth service database
echo "  -> Migrating auth_db..."
$SSH_CMD "docker exec kashif-auth-db psql -U auth_user -d auth_db -c \"
ALTER TABLE terms_of_service ADD COLUMN IF NOT EXISTS title_ku VARCHAR(255);
ALTER TABLE terms_of_service ADD COLUMN IF NOT EXISTS content_ku TEXT;
\""

# Gamification service database
echo "  -> Migrating gamification_db..."
$SSH_CMD "docker exec kashif-gamification-db psql -U gamification_user -d gamification_db -c \"
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS name_ku VARCHAR(100);
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS description_ku TEXT;
ALTER TABLE weekly_challenges ADD COLUMN IF NOT EXISTS title_ku VARCHAR(200);
ALTER TABLE weekly_challenges ADD COLUMN IF NOT EXISTS description_ku VARCHAR(500);
\""

# Notification service database
echo "  -> Migrating notification_db..."
$SSH_CMD "docker exec kashif-notification-db psql -U notification_user -d notification_db -c \"
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title_ku VARCHAR(150);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS body_ku TEXT;
\""

# Reporting service database (name_ku may already exist)
echo "  -> Migrating reporting_db..."
$SSH_CMD "docker exec kashif-reporting-db psql -U reporting_user -d reporting_db -c \"
ALTER TABLE report_categories ADD COLUMN IF NOT EXISTS name_ku VARCHAR(100);
\""

# Step 3: Rebuild and restart Docker containers
echo ""
echo ">>> Step 3: Rebuilding Docker containers..."
$SSH_CMD "cd /root/Kashif/Backend && docker-compose build --no-cache auth-service gamification-service notification-service reporting-service pothole-detection-service"

echo ""
echo ">>> Step 4: Restarting services..."
$SSH_CMD "cd /root/Kashif/Backend && docker-compose up -d auth-service gamification-service notification-service reporting-service pothole-detection-service"

# Step 5: Seed Kurdish data for achievements and challenges
echo ""
echo ">>> Step 5: Seeding Kurdish achievement data..."
$SSH_CMD "docker exec kashif-gamification-db psql -U gamification_user -d gamification_db -c \"
UPDATE achievements SET name_ku = CASE 
  WHEN name = 'First Report' THEN 'Rapora Yekem'
  WHEN name = 'Road Guardian' THEN 'Parêzgerê Rê'
  WHEN name = 'Safety Scout' THEN 'Keşifa Ewlehiyê'
  WHEN name = 'Community Champion' THEN 'Şampiyonê Civakê'
  WHEN name = 'Map Master' THEN 'Mamosteyê Nexşeyê'
  WHEN name = 'Streak Keeper' THEN 'Parastina Rêzê'
  WHEN name = 'Night Watcher' THEN 'Nobetdarê Şevê'
  WHEN name = 'Speed Reporter' THEN 'Raportkerê Bilez'
  WHEN name = 'Photo Pro' THEN 'Pispor Wêne'
  WHEN name = 'Helper' THEN 'Alîkar'
  WHEN name = 'Explorer' THEN 'Keşifger'
  WHEN name = 'Veteran Reporter' THEN 'Raportkerê Pispor'
  WHEN name = 'Legend' THEN 'Efsane'
  WHEN name = 'Pothole Hunter' THEN 'Nêçîrvanê Çalan'
  WHEN name = 'Speed Watcher' THEN 'Çavdêrê Lezê'
  WHEN name = 'Accident Reporter' THEN 'Raportkerê Qeza'
  ELSE name_ku
END WHERE name_ku IS NULL;
\""

echo ""
echo ">>> Step 6: Rebuilding admin panel..."
$SSH_CMD "cd /root/Kashif/admin && docker-compose build --no-cache && docker-compose up -d"

echo ""
echo "=== Deployment Complete ==="
echo "Verify services are running:"
$SSH_CMD "cd /root/Kashif/Backend && docker-compose ps"
