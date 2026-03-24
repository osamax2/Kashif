# Backend Integration Guide

## ✅ Was wurde integriert

### 1. API Client Service (`services/api.ts`)
- **Axios** für HTTP-Requests
- **AsyncStorage** für Token-Speicherung
- Automatisches Token-Refresh
- Error Handling

### 2. Login-Integration (`app/index.tsx`)
- Verbindung mit Backend Auth API
- Token-Speicherung
- Fehlerbehandlung (401, Network Errors, Timeouts)
- Loading-Zustand
- Password-Toggle (Anzeigen/Verstecken)

### 3. Registrierungs-Integration (`app/register.tsx`)
- Verbindung mit Backend Register API
- Formular-Validierung:
  - Email-Format
  - Password-Länge (min. 6 Zeichen)
  - Pflichtfelder
  - Terms of Service
- Auto-Login nach Registrierung
- Fehlerbehandlung

## 🔧 API Endpunkte

### Auth API
```typescript
// Login
authAPI.login({ username: email, password })

// Register
authAPI.register({ 
  email, 
  password, 
  full_name, 
  phone_number 
})

// Get Profile
authAPI.getProfile()

// Logout
authAPI.logout()
```

### Lookup API
```typescript
// Get Levels
lookupAPI.getLevels()

// Get Categories
lookupAPI.getCategories()

// Get Statuses
lookupAPI.getStatuses()

// Get Severities
lookupAPI.getSeverities(categoryId?)
```

## 🌐 Server Konfiguration

**Backend URL:** `http://38.127.216.236:8000`

Diese URL ist in `services/api.ts` konfiguriert:
```typescript
const API_BASE_URL = 'http://38.127.216.236:8000';
```

## 🔐 Token Management

### Token-Speicherung
- **Access Token:** `@kashif_access_token`
- **Refresh Token:** `@kashif_refresh_token`
- **User Data:** `@kashif_user`

### Automatisches Token-Refresh
Der API-Client erneuert automatisch abgelaufene Tokens:
1. Request schlägt mit 401 fehl
2. Refresh Token wird verwendet
3. Neue Tokens werden gespeichert
4. Original-Request wird wiederholt

## 📱 Verwendung im Frontend

### Login-Flow
```typescript
const handleLogin = async () => {
  try {
    // 1. Login
    const response = await authAPI.login({ 
      username: email, 
      password 
    });
    
    // 2. Get Profile
    await authAPI.getProfile();
    
    // 3. Navigate to Home
    router.replace('/(tabs)/home');
    
  } catch (error) {
    // Handle errors
  }
};
```

### Registrierungs-Flow
```typescript
const onSubmit = async () => {
  try {
    // 1. Register
    await authAPI.register({
      email,
      password,
      full_name,
      phone_number
    });
    
    // 2. Auto-Login
    await authAPI.login({ username: email, password });
    
    // 3. Get Profile
    await authAPI.getProfile();
    
    // 4. Navigate
    router.replace('/(tabs)/home');
    
  } catch (error) {
    // Handle errors
  }
};
```

## 🧪 Testing

### Login testen
1. Öffne die App
2. Gib Test-Credentials ein:
   - Email: `test@kashif.com`
   - Password: `Test123!`
3. Klicke "تسجيل الدخول"

### Registrierung testen
1. Klicke "أنشئ حسابًا جديدًا"
2. Fülle das Formular aus
3. Aktiviere "أوافق على شروط الاستخدام"
4. Klicke "تسجيل حساب جديد"

## ⚠️ Error Handling

### Fehlertypen
- **401 Unauthorized:** Falsche Credentials
- **400 Bad Request:** Email bereits registriert
- **Network Error:** Keine Verbindung zum Server
- **Timeout:** Server antwortet nicht rechtzeitig

### Error Messages (Arabisch)
- `'البريد الإلكتروني أو كلمة المرور غير صحيحة'` - Falsche Credentials
- `'البريد الإلكتروني مسجل بالفعل'` - Email existiert bereits
- `'تعذر الاتصال بالخادم'` - Netzwerkfehler
- `'انتهت مهلة الاتصال'` - Timeout

## 🔜 Nächste Schritte

### Reports Integration
1. Create Report API
2. Get Reports API
3. Update Report Status
4. Get Report Details

### Gamification Integration
1. Get User Points
2. Get Leaderboard
3. Award Points
4. Redeem Points

### Coupons Integration
1. Get Available Coupons
2. Redeem Coupon
3. Get User Coupons

### Notifications Integration
1. Register Device Token
2. Get Notifications
3. Mark as Read

## 📦 Dependencies

```json
{
  "axios": "^1.6.0",
  "@react-native-async-storage/async-storage": "^1.21.0"
}
```

## 🐛 Troubleshooting

### "Network Error"
- Prüfe ob Backend läuft: `curl http://38.127.216.236:8000/health`
- Prüfe Internet-Verbindung
- Bei iOS Simulator: Verwende `localhost` statt IP

### "Request timeout"
- Backend könnte langsam sein
- Timeout erhöhen in `api.ts`: `timeout: 30000`

### Token nicht gespeichert
- AsyncStorage Permissions prüfen
- Console logs prüfen
- Storage leeren: `AsyncStorage.clear()`

## 📊 Backend Status

Alle Services laufen auf: `http://38.127.216.236:8000`

- ✅ Auth Service: `/api/auth/`
- ✅ Reporting Service: `/api/reports/`
- ✅ Gamification Service: `/api/gamification/`
- ✅ Coupons Service: `/api/coupons/`
- ✅ Notifications Service: `/api/notifications/`

### Verfügbare Lookup-Daten
- 5 Levels (Bronze, Silver, Gold, Platinum, Diamond)
- 5 Categories (Infrastructure, Environment, Public Safety, etc.)
- 5 Report Statuses (NEW, IN_PROGRESS, RESOLVED, etc.)
- 15 Severities (LOW/MEDIUM/HIGH für jede Kategorie)
- 6 Coupon Categories
