#!/bin/bash

# Script to upload and run the category update script on the server
# Usage: ./update_categories.sh

SERVER="root@38.127.216.236"
REMOTE_PATH="/root/kashif/Backend"
SCRIPT_NAME="update_report_categories.py"

echo "=================================================="
echo "🚀 Updating Report Categories on Server"
echo "=================================================="

# Upload the script to server
echo ""
echo "📤 Uploading script to server..."
scp "$SCRIPT_NAME" "$SERVER:$REMOTE_PATH/"

if [ $? -ne 0 ]; then
    echo "❌ Failed to upload script"
    exit 1
fi

echo "✅ Script uploaded successfully"

# Execute the script on server
echo ""
echo "🔄 Running update script on server..."
echo ""

ssh "$SERVER" << 'ENDSSH'
cd /root/kashif/Backend

# Make sure we're in the right directory
if [ ! -f "update_report_categories.py" ]; then
    echo "❌ Script not found in /root/kashif/Backend"
    exit 1
fi

# Run the script using the reporting-service container's Python
echo "Running script in Docker container..."
docker exec -i kashif-reporting python3 /app/update_report_categories.py

# Check exit status
if [ $? -eq 0 ]; then
    echo ""
    echo "=================================================="
    echo "✅ Categories updated successfully on server!"
    echo "=================================================="
else
    echo ""
    echo "=================================================="
    echo "❌ Failed to update categories"
    echo "=================================================="
    exit 1
fi
ENDSSH

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All done! Categories have been updated on the server."
else
    echo ""
    echo "❌ Something went wrong. Please check the output above."
    exit 1
fi
