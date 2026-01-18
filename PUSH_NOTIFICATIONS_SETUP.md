# Push Notifications Setup Guide

## Problem
Push notifications are created in the database but not delivered to devices because Firebase Cloud Messaging (FCM) is not configured.

## Solution - Configure Firebase

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project" or select existing project
3. Project name: **Kashif** (or any name)
4. Follow setup wizard

### Step 2: Get Service Account Key

1. In Firebase Console, go to **Project Settings** (⚙️ icon)
2. Select **Service Accounts** tab
3. Click **Generate New Private Key**
4. Download the JSON file (e.g., `kashif-firebase-adminsdk.json`)

### Step 3: Upload to Server

Upload the Firebase credentials to your server:

```bash
# From your local machine
scp kashif-firebase-adminsdk.json root@87.106.51.243:/root/Kashif/Backend/notification-service/firebase-credentials.json
```

Or use password authentication:
```bash
sshpass -p '7AngX6ez' scp kashif-firebase-adminsdk.json root@87.106.51.243:/root/Kashif/Backend/notification-service/firebase-credentials.json
```

### Step 4: Update Docker Compose

The docker-compose.yml is already configured with:
```yaml
FIREBASE_CREDENTIALS_PATH: /app/firebase-credentials.json
```

### Step 5: Rebuild notification-service

```bash
# SSH to server
ssh root@87.106.51.243

# Navigate to backend
cd /root/Kashif/Backend

# Rebuild and restart notification service
docker compose up -d --build notification-service

# Check logs
docker compose logs -f notification-service
```

You should see:
```
Firebase Admin SDK initialized successfully
```

### Step 6: Test Push Notifications

1. **Build and install the app** (push notifications don't work in Expo Go):
   ```bash
   cd /Volumes/WorkSSD/Kashif
   ./build-android-local.sh
   adb install kashif-app-Release.apk
   ```

2. **Login to the app** - device token will be automatically registered

3. **Send test notification from Admin**:
   - Go to https://admin.kashifroad.com/dashboard/notifications
   - Fill in User ID, Title, Body
   - Click "Send Notification"

4. **Check notification** - you should receive a push notification on your device

## Verification

### Check if Firebase is initialized:
```bash
ssh root@87.106.51.243 "cd /root/Kashif/Backend && docker compose logs notification-service | grep -i firebase"
```

Expected output:
```
Firebase Admin SDK initialized successfully
```

### Check if device token is registered:
```bash
ssh root@87.106.51.243 "cd /root/Kashif/Backend && docker compose exec notification-db psql -U kashif_notif -d kashif_notifications -c 'SELECT * FROM device_tokens;'"
```

You should see your device token.

## Troubleshooting

### No push notification received?

1. **Check Firebase credentials exist**:
   ```bash
   ssh root@87.106.51.243 "cd /root/Kashif/Backend/notification-service && ls -la firebase-credentials.json"
   ```

2. **Check notification service logs**:
   ```bash
   ssh root@87.106.51.243 "cd /root/Kashif/Backend && docker compose logs -f notification-service"
   ```

3. **Check device token in database**:
   ```bash
   ssh root@87.106.51.243 "cd /root/Kashif/Backend && docker compose exec notification-db psql -U kashif_notif -d kashif_notifications -c 'SELECT * FROM device_tokens;'"
   ```

4. **Check notification in database**:
   ```bash
   ssh root@87.106.51.243 "cd /root/Kashif/Backend && docker compose exec notification-db psql -U kashif_notif -d kashif_notifications -c 'SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5;'"
   ```

### Firebase not initialized?

Make sure the credentials file is mounted in Docker:
```yaml
volumes:
  - ./notification-service/firebase-credentials.json:/app/firebase-credentials.json
```

## Code Changes Made

1. ✅ **services/notifications.ts**: 
   - Enabled `registerDeviceToken()` - was commented out
   - Enabled `unregisterDevice()` - was commented out
   - Added `Platform` import from react-native

2. ✅ **contexts/NotificationContext.tsx**:
   - Automatically calls `registerForPushNotifications()` when user logs in

## What Happens Now

1. User logs in → App requests push notification permission
2. App gets Expo Push Token from device
3. App sends token to backend: `POST /api/notifications/register-device`
4. Backend stores token in database
5. Admin sends notification → Backend creates notification in DB
6. Backend calls `fcm_service.send_push_notification()` 
7. FCM sends push notification to device via Expo Push Token
8. Device receives push notification ✅

## Important Notes

- Push notifications **DO NOT** work in Expo Go
- You must build a **development build** or **production build** to test
- Use `./build-android-local.sh` to build APK
- Firebase service account JSON must be kept secure
- Never commit `firebase-credentials.json` to git
