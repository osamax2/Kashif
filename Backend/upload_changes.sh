#!/bin/bash

# Server details
SERVER="admin@38.127.216.236"
REMOTE_PATH="/root/Kashif_backend/Kashif/Backend"

echo "=== Uploading Backend Changes to Server ==="
echo ""

# Upload auth-service files
echo "1. Uploading auth-service/rabbitmq_consumer.py (NEW FILE)..."
scp auth-service/rabbitmq_consumer.py $SERVER:$REMOTE_PATH/auth-service/

echo "2. Uploading auth-service/crud.py (UPDATED)..."
scp auth-service/crud.py $SERVER:$REMOTE_PATH/auth-service/

echo "3. Uploading auth-service/main.py (UPDATED)..."
scp auth-service/main.py $SERVER:$REMOTE_PATH/auth-service/

# Upload gamification-service files
echo "4. Uploading gamification-service/rabbitmq_consumer.py (UPDATED)..."
scp gamification-service/rabbitmq_consumer.py $SERVER:$REMOTE_PATH/gamification-service/

echo ""
echo "=== Restart Services on Server ==="
echo "After upload, connect to server and run:"
echo "ssh $SERVER"
echo "cd $REMOTE_PATH"
echo "docker-compose restart auth-service gamification-service"
echo ""
echo "=== Upload Complete ==="
