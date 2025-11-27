# Language Support - Deployment Instructions

## Overview
This document describes how to deploy the language support feature to the production server.

## Changes Made

### Backend Files Modified
1. **models.py** - Added `language` column to User model
2. **schemas.py** - Added `language` field to schemas and `LanguageUpdate` schema
3. **crud.py** - Added `update_user_language()` function
4. **main.py** - Added `PATCH /me/language` endpoint

### Database Changes
- Added `language VARCHAR(2)` column to `users` table
- Default value: `'ar'` (Arabic)
- Allowed values: `'ar'`, `'en'`

## Deployment Steps

### Option 1: Automated Deployment (Recommended)

Run the deployment script from your local machine:

```bash
cd /Users/osamaalabaji/Kashif/Backend/auth-service
./deploy_language_support.sh
```

This script will:
1. Upload all modified files to the server
2. Run the database migration
3. Restart the auth service
4. Test the health endpoint

### Option 2: Manual Deployment

#### Step 1: Upload Files to Server

```bash
# From your local machine
cd /Users/osamaalabaji/Kashif/Backend/auth-service

scp models.py root@178.63.45.250:/root/Kashif/Backend/auth-service/
scp schemas.py root@178.63.45.250:/root/Kashif/Backend/auth-service/
scp crud.py root@178.63.45.250:/root/Kashif/Backend/auth-service/
scp main.py root@178.63.45.250:/root/Kashif/Backend/auth-service/
```

#### Step 2: Connect to Server

```bash
ssh root@178.63.45.250
cd /root/Kashif/Backend/auth-service
```

#### Step 3: Run Database Migration

```bash
# Option A: Using docker exec
docker exec -i postgres_container psql -U kashif -d auth_db << EOF
ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(2) DEFAULT 'ar' NOT NULL;
UPDATE users SET language = 'ar' WHERE language IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_language ON users(language);
EOF

# Option B: Using migration file
docker exec -i postgres_container psql -U kashif -d auth_db < migrations/001_add_language_column.sql
```

#### Step 4: Verify Migration

```bash
docker exec -it postgres_container psql -U kashif -d auth_db -c "SELECT id, email, language FROM users LIMIT 5;"
```

Expected output should show the `language` column with 'ar' values.

#### Step 5: Restart Auth Service

```bash
cd /root/Kashif/Backend
docker-compose restart auth-service

# Wait a few seconds
sleep 5

# Check if service is running
docker-compose ps auth-service
docker-compose logs --tail=20 auth-service
```

#### Step 6: Test the Endpoint

```bash
# Test health endpoint
curl http://localhost:8001/health

# Test with actual user (replace YOUR_TOKEN with a valid JWT)
curl -X PATCH http://localhost:8001/me/language \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"language": "en"}'
```

## API Endpoints

### 1. Update Language Preference

**Endpoint:** `PATCH /me/language`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "language": "ar"
}
```

**Valid Languages:**
- `ar` - Arabic (العربية)
- `en` - English

**Success Response (200):**
```json
{
  "message": "Language preference updated successfully",
  "language": "ar"
}
```

**Error Response (400):**
```json
{
  "detail": "Invalid language. Must be 'ar' or 'en'"
}
```

### 2. Get User Profile (Updated)

**Endpoint:** `GET /me`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Success Response (200):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "User Name",
  "phone": "+966501234567",
  "role": "USER",
  "total_points": 150,
  "image_url": null,
  "level_id": 2,
  "status": "ACTIVE",
  "language": "ar",
  "last_login": "2025-11-27T10:30:00",
  "created_at": "2025-11-01T08:00:00",
  "updated_at": "2025-11-27T10:30:00"
}
```

## Testing

### Test with curl

```bash
# 1. Login first
TOKEN=$(curl -X POST http://178.63.45.250:8001/token \
  -d "username=test@example.com&password=testpass" \
  | jq -r '.access_token')

# 2. Get current profile
curl -H "Authorization: Bearer $TOKEN" \
  http://178.63.45.250:8001/me | jq '.language'

# 3. Update to English
curl -X PATCH http://178.63.45.250:8001/me/language \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"language": "en"}' | jq '.'

# 4. Verify update
curl -H "Authorization: Bearer $TOKEN" \
  http://178.63.45.250:8001/me | jq '.language'
```

### Test with Python Script

```bash
# From auth-service directory
python3 test_language.py
```

## Rollback Instructions

If you need to rollback the changes:

```bash
# 1. Revert database changes
docker exec -it postgres_container psql -U kashif -d auth_db << EOF
ALTER TABLE users DROP COLUMN IF EXISTS language;
EOF

# 2. Restore old code files from git
git checkout HEAD^ -- models.py schemas.py crud.py main.py

# 3. Restart service
docker-compose restart auth-service
```

## Verification Checklist

After deployment, verify:

- [ ] Database migration completed successfully
- [ ] Auth service restarted without errors
- [ ] Health endpoint returns 200
- [ ] GET /me includes `language` field
- [ ] PATCH /me/language accepts 'ar' and 'en'
- [ ] PATCH /me/language rejects invalid languages
- [ ] Frontend app can update language preference
- [ ] Language preference persists across login sessions

## Troubleshooting

### Service won't start
```bash
# Check logs
docker-compose logs auth-service

# Common issues:
# - Syntax error in Python files
# - Database connection failed
# - Missing dependencies
```

### Migration failed
```bash
# Check if column already exists
docker exec -it postgres_container psql -U kashif -d auth_db -c "\d users"

# If column exists, skip migration
# If not, run migration manually
```

### Endpoint returns 500
```bash
# Check service logs
docker-compose logs --tail=50 auth-service

# Common causes:
# - Database column not created
# - CRUD function not working
# - Schema validation error
```

## Support

For issues or questions:
- Check service logs: `docker-compose logs auth-service`
- Check database: `docker exec -it postgres_container psql -U kashif -d auth_db`
- Review BACKEND_LANGUAGE_INTEGRATION.md for full documentation
