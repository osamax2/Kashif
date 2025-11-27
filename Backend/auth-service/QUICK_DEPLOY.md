# Language Support - Quick Deployment Guide

## 🚀 Quick Start (For Server Deployment)

### Step 1: Upload Files to Server

From your local machine, upload the modified files:

```bash
# Navigate to the auth-service directory
cd /Users/osamaalabaji/Kashif/Backend/auth-service

# Use scp or your preferred method to upload these files:
# - models.py
# - schemas.py  
# - crud.py
# - main.py
# - install_on_server.sh

# Example using scp:
scp models.py schemas.py crud.py main.py install_on_server.sh \
  root@178.63.45.250:/root/Kashif/Backend/auth-service/
```

### Step 2: SSH to Server

```bash
ssh root@178.63.45.250
```

### Step 3: Run Installation Script

```bash
cd /root/Kashif/Backend/auth-service
chmod +x install_on_server.sh
./install_on_server.sh
```

The script will:
1. ✓ Create backups of current files
2. ✓ Run database migration (add language column)
3. ✓ Verify database changes
4. ✓ Restart auth service
5. ✓ Test health endpoint

### Step 4: Verify Installation

Test the new endpoint:

```bash
# Get a token first (replace with actual credentials)
TOKEN=$(curl -X POST http://localhost:8001/token \
  -d "username=your@email.com&password=yourpassword" \
  | jq -r '.access_token')

# Test language endpoint
curl -X PATCH http://localhost:8001/me/language \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"language": "en"}' | jq '.'
```

Expected response:
```json
{
  "message": "Language preference updated successfully",
  "language": "en"
}
```

## 📝 What Changed

### Database
- Added `language VARCHAR(2)` column to `users` table
- Default value: `'ar'` (Arabic)
- All existing users set to `'ar'`

### Backend Code
- **models.py**: Added `language` field to User model
- **schemas.py**: Added language to schemas + new `LanguageUpdate` schema
- **crud.py**: Added `update_user_language()` function
- **main.py**: Added `PATCH /me/language` endpoint

### New API Endpoints
- `PATCH /me/language` - Update user's language preference
- `GET /me` - Now returns language field

## 🧪 Testing

### Frontend Testing
The frontend app is already configured to use the endpoint:
1. Open app
2. Go to Settings (الإعدادات)
3. Tap on Language (اللغة)
4. Select English
5. App will restart with English UI

### Manual API Testing

```bash
# 1. Login
curl -X POST http://178.63.45.250:8001/token \
  -d "username=test@example.com&password=testpass"

# 2. Update language
curl -X PATCH http://178.63.45.250:8001/me/language \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"language": "en"}'

# 3. Get profile (verify language field)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://178.63.45.250:8001/me | jq '.language'
```

## 🔄 Rollback (if needed)

```bash
# SSH to server
ssh root@178.63.45.250
cd /root/Kashif/Backend/auth-service

# Restore backup files
cp backups/models.py.backup models.py
cp backups/schemas.py.backup schemas.py
cp backups/crud.py.backup crud.py
cp backups/main.py.backup main.py

# Remove database column
docker exec -it postgres_container psql -U kashif -d auth_db -c \
  "ALTER TABLE users DROP COLUMN IF EXISTS language;"

# Restart service
cd /root/Kashif/Backend
docker-compose restart auth-service
```

## ✅ Checklist

Before deployment:
- [ ] Files uploaded to server
- [ ] SSH access to server confirmed
- [ ] Database backup created (optional but recommended)

During deployment:
- [ ] Run install_on_server.sh
- [ ] Check for errors in output
- [ ] Verify service restarted successfully

After deployment:
- [ ] Test health endpoint
- [ ] Test PATCH /me/language with valid token
- [ ] Test invalid language (should reject)
- [ ] Test GET /me returns language field
- [ ] Test from mobile app

## 📞 Troubleshooting

### Service won't start
```bash
docker-compose logs --tail=50 auth-service
```

### Migration failed
```bash
# Check if column exists
docker exec -it postgres_container psql -U kashif -d auth_db -c "\d users"
```

### Endpoint returns error
```bash
# Check recent logs
docker-compose logs --tail=20 auth-service

# Test health
curl http://localhost:8001/health
```

## 📚 Full Documentation

See `DEPLOYMENT_GUIDE.md` for complete documentation including:
- Detailed deployment steps
- API endpoint specifications
- Comprehensive testing procedures
- Rollback instructions
