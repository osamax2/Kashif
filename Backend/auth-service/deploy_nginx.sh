#!/bin/bash
# Deploy nginx configuration to fix 404 errors

echo "🚀 Deploying nginx configuration..."

# Copy nginx config to server
echo "📤 Uploading nginx.conf..."
scp nginx.conf root@38.127.216.236:/tmp/nginx.conf

# Copy to container and reload
echo "🔧 Applying configuration..."
ssh root@38.127.216.236 << 'EOF'
    # Copy config into container
    docker cp /tmp/nginx.conf kashif-gateway:/etc/nginx/conf.d/default.conf
    
    # Test nginx configuration
    echo "✅ Testing nginx configuration..."
    docker exec kashif-gateway nginx -t
    
    # Reload nginx
    echo "🔄 Reloading nginx..."
    docker exec kashif-gateway nginx -s reload
    
    echo "✓ Configuration applied successfully"
EOF

# Test the endpoints
echo ""
echo "🧪 Testing endpoints..."
echo "Testing /health..."
curl -s http://38.127.216.236:8000/health
echo ""
echo ""
echo "Testing /auth/health..."
curl -s http://38.127.216.236:8000/auth/health
echo ""

echo ""
echo "✅ Deployment complete!"
