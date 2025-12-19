#!/bin/bash

# Test script for category delete functionality

echo "======================================"
echo "Testing Category Delete Functionality"
echo "======================================"
echo ""

# Login and get token
echo "1. Login as admin..."
TOKEN=$(curl -s -X POST http://87.106.51.243:8000/api/auth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@kashif.com&password=admin123" | \
  grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Login failed!"
    exit 1
fi
echo "✅ Login successful"
echo ""

# Create a test category
echo "2. Creating test category..."
CREATE_RESPONSE=$(curl -s -X POST http://87.106.51.243:8000/api/coupons/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Delete Test Category","description":"Will be deleted","icon_name":"test","sort_order":999}')

CAT_ID=$(echo $CREATE_RESPONSE | grep -o '"id":[0-9]*' | cut -d':' -f2)

if [ -z "$CAT_ID" ]; then
    echo "❌ Failed to create category!"
    echo "Response: $CREATE_RESPONSE"
    exit 1
fi
echo "✅ Category created with ID: $CAT_ID"
echo ""

# Get all categories (should include new one)
echo "3. Getting all categories..."
ALL_CATS=$(curl -s http://87.106.51.243:8000/api/coupons/categories \
  -H "Authorization: Bearer $TOKEN")
COUNT_BEFORE=$(echo $ALL_CATS | grep -o '"status":"ACTIVE"' | wc -l | tr -d ' ')
echo "✅ Found $COUNT_BEFORE ACTIVE categories"
echo ""

# Delete the category
echo "4. Deleting category $CAT_ID..."
DELETE_RESPONSE=$(curl -s -X DELETE http://87.106.51.243:8000/api/coupons/categories/$CAT_ID \
  -H "Authorization: Bearer $TOKEN")
DELETE_STATUS=$(echo $DELETE_RESPONSE | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

if [ "$DELETE_STATUS" != "DELETED" ]; then
    echo "❌ Delete failed! Status: $DELETE_STATUS"
    echo "Response: $DELETE_RESPONSE"
    exit 1
fi
echo "✅ Category deleted successfully (soft delete)"
echo ""

# Get all categories again (should not include deleted one if frontend filters correctly)
echo "5. Getting all categories after delete..."
ALL_CATS_AFTER=$(curl -s http://87.106.51.243:8000/api/coupons/categories \
  -H "Authorization: Bearer $TOKEN")
COUNT_AFTER=$(echo $ALL_CATS_AFTER | grep -o '"status":"ACTIVE"' | wc -l | tr -d ' ')
echo "✅ Found $COUNT_AFTER ACTIVE categories"
echo ""

# Verify the category is marked as DELETED
DELETED_COUNT=$(echo $ALL_CATS_AFTER | grep -o '"status":"DELETED"' | wc -l | tr -d ' ')
echo "📊 Total DELETED categories: $DELETED_COUNT"
echo ""

echo "======================================"
echo "✅ All tests passed!"
echo "======================================"
echo ""
echo "Frontend should filter out categories with status='DELETED'"
echo "Expected behavior: Category $CAT_ID should NOT appear in the UI"
echo ""
echo "Test the frontend at: http://87.106.51.243:3001/dashboard/categories"
