#!/bin/bash

echo "=========================================="
echo "🔍 Kashif Backend Server Test"
echo "Server: 38.127.216.236:8000"
echo "=========================================="
echo ""

# Test 1: Gateway Health
echo "1️⃣  Testing Gateway Health..."
GATEWAY=$(curl -s http://38.127.216.236:8000/health)
if [[ $GATEWAY == *"running"* ]]; then
    echo "✅ Gateway is running"
else
    echo "❌ Gateway not responding"
    exit 1
fi
echo ""

# Test 2: Auth Service
echo "2️⃣  Testing Auth Service..."
AUTH=$(curl -s -o /dev/null -w "%{http_code}" http://38.127.216.236:8000/api/auth/health)
if [ "$AUTH" = "200" ]; then
    echo "✅ Auth Service is healthy"
else
    echo "❌ Auth Service failed (HTTP $AUTH)"
fi
echo ""

# Test 3: Reporting Service
echo "3️⃣  Testing Reporting Service..."
REPORT=$(curl -s -o /dev/null -w "%{http_code}" http://38.127.216.236:8000/api/reports/health)
if [ "$REPORT" = "200" ]; then
    echo "✅ Reporting Service is healthy"
else
    echo "❌ Reporting Service failed (HTTP $REPORT)"
fi
echo ""

# Test 4: Gamification Service
echo "4️⃣  Testing Gamification Service..."
GAMIF=$(curl -s -o /dev/null -w "%{http_code}" http://38.127.216.236:8000/api/gamification/health)
if [ "$GAMIF" = "200" ]; then
    echo "✅ Gamification Service is healthy"
else
    echo "❌ Gamification Service failed (HTTP $GAMIF)"
fi
echo ""

# Test 5: Coupons Service
echo "5️⃣  Testing Coupons Service..."
COUPON=$(curl -s -o /dev/null -w "%{http_code}" http://38.127.216.236:8000/api/coupons/health)
if [ "$COUPON" = "200" ]; then
    echo "✅ Coupons Service is healthy"
else
    echo "❌ Coupons Service failed (HTTP $COUPON)"
fi
echo ""

# Test 6: Notifications Service
echo "6️⃣  Testing Notifications Service..."
NOTIF=$(curl -s -o /dev/null -w "%{http_code}" http://38.127.216.236:8000/api/notifications/health)
if [ "$NOTIF" = "200" ]; then
    echo "✅ Notifications Service is healthy"
else
    echo "❌ Notifications Service failed (HTTP $NOTIF)"
fi
echo ""

# Test 7: User Registration
echo "7️⃣  Testing User Registration..."
REGISTER=$(curl -s -X POST http://38.127.216.236:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@kashif.com",
    "password": "Test123!",
    "full_name": "Test User",
    "phone_number": "+1234567890"
  }' -w "\n%{http_code}")

HTTP_CODE=$(echo "$REGISTER" | tail -n 1)
RESPONSE=$(echo "$REGISTER" | head -n -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ]; then
    echo "✅ Registration endpoint is working"
    echo "Response: $RESPONSE"
else
    echo "❌ Registration failed (HTTP $HTTP_CODE)"
fi
echo ""

# Test 8: User Login
echo "8️⃣  Testing User Login..."
LOGIN=$(curl -s -X POST http://38.127.216.236:8000/api/auth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@kashif.com&password=Test123!" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$LOGIN" | tail -n 1)
RESPONSE=$(echo "$LOGIN" | head -n -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ]; then
    echo "✅ Login endpoint is working"
    if [[ $RESPONSE == *"access_token"* ]]; then
        ACCESS_TOKEN=$(echo "$RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
        echo "🔑 Got access token: ${ACCESS_TOKEN:0:20}..."
    else
        echo "Response: $RESPONSE"
    fi
else
    echo "❌ Login failed (HTTP $HTTP_CODE)"
fi
echo ""

# Test 9: Get Categories
echo "9️⃣  Testing Categories Endpoint..."
CATEGORIES=$(curl -s -o /dev/null -w "%{http_code}" http://38.127.216.236:8000/api/reports/categories)
if [ "$CATEGORIES" = "200" ]; then
    echo "✅ Categories endpoint is working"
    curl -s http://38.127.216.236:8000/api/reports/categories | head -c 200
    echo "..."
else
    echo "❌ Categories failed (HTTP $CATEGORIES)"
fi
echo ""

# Test 10: Get Levels
echo "🔟 Testing Levels Endpoint..."
LEVELS=$(curl -s -o /dev/null -w "%{http_code}" http://38.127.216.236:8000/api/gamification/levels)
if [ "$LEVELS" = "200" ]; then
    echo "✅ Levels endpoint is working"
    curl -s http://38.127.216.236:8000/api/gamification/levels | head -c 200
    echo "..."
else
    echo "❌ Levels failed (HTTP $LEVELS)"
fi
echo ""

echo "=========================================="
echo "✨ Test Complete"
echo "=========================================="
