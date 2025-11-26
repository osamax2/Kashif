# Kashif Backend - Zusammenfassung & API-Informationen

## ✅ Was fertig ist

### 1. **Keine API-Keys erforderlich!**
Das Backend verwendet **JWT Bearer Token** Authentifizierung, keine API-Keys.

### 2. Microservices Architektur
- ✅ Auth Service (Port 8001)
- ✅ Reporting Service (Port 8002) 
- ✅ Gamification Service (Port 8003)
- ✅ Coupons Service (Port 8004)
- ✅ Notification Service (Port 8005)
- ✅ Nginx API Gateway (Port 8000)

### 3. Datenbank Schema
- Alle 5 PostgreSQL Datenbanken konfiguriert
- Models aktualisiert gemäß Ihrem DBML Schema
- Alembic Migrationen vorbereitet

### 4. Test-Dateien erstellt
- `auth-service/test_auth.py`
- `reporting-service/test_reporting.py`
- `gamification-service/test_gamification.py`
- `coupons-service/test_coupons.py`
- `notification-service/test_notification.py`

### 5. Dokumentation
- `FRONTEND_INTEGRATION.md` - Komplette API-Integration für Frontend
- `.env` - Environment-Variablen
- `SCHEMA_UPDATE.md` - Datenbank-Schema-Dokumentation

## 🚨 Aktuelles Problem

**Alembic Migration Issue**: Nur `auth-service` hat funktionierendes Alembic-Setup. Die anderen Services crashen beim Start mit:
```
FAILED: Path doesn't exist: '/app/alembic'
```

## 🔧 Lösung (Manuelle Schritte)

### Option 1: Services ohne Alembic starten

Bearbeiten Sie `docker-compose.yml` und entfernen Sie `alembic upgrade head &&` aus der command-Zeile für alle Services außer auth-service:

```yaml
reporting-service:
  command: sh -c "uvicorn main:app --host 0.0.0.0 --port 8000"
  # Statt: sh -c "alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port 8000"
```

Dann:
```bash
cd /Users/osamaalabaji/Kashif/backend
docker-compose down
docker-compose up -d
```

### Option 2: Alembic manuell in Containern initialisieren

```bash
# Services ohne Alembic starten
docker-compose down
# docker-compose.yml wie oben bearbeiten
docker-compose up -d

# Dann in jedem Container:
docker exec -it kashif-reporting sh -c "cd /app && alembic init alembic"
docker exec -it kashif-gamification sh -c "cd /app && alembic init alembic"
docker exec -it kashif-coupons sh -c "cd /app && alembic init alembic"
docker exec -it kashif-notification sh -c "cd /app && alembic init alembic"
```

## 📱 Frontend Integration

### Base URL
```typescript
const API_BASE_URL = 'http://localhost:8000/api';
```

### Authentication Flow

1. **Register**
```typescript
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "User Name"
}
```

2. **Login**
```typescript
POST /api/auth/token
Content-Type: application/x-www-form-urlencoded

username=user@example.com&password=password123

Response:
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

3. **Use Token**
```typescript
GET /api/auth/me
Authorization: Bearer eyJ...

Response:
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "User Name",
  "total_points": 0,
  "role": "USER"
}
```

### API Endpoints

#### Auth (`/api/auth/`)
- `POST /register` - Registrieren
- `POST /token` - Login
- `POST /refresh` - Token erneuern
- `GET /me` - Aktuelle User-Info
- `POST /logout` - Logout

#### Reports (`/api/reports/`)
- `POST /reports/` - Report erstellen
- `GET /reports/` - Meine Reports
- `GET /reports/{id}` - Report Details
- `PUT /reports/{id}/status` - Status ändern
- `GET /reports/nearby?lat=33.5&lng=36.2&radius_km=5` - Reports in der Nähe

#### Gamification (`/api/gamification/`)
- `GET /points/{user_id}` - Punkte abrufen
- `GET /points/{user_id}/transactions` - Transaktions-Historie
- `GET /leaderboard/?limit=10` - Top-Benutzer

#### Coupons (`/api/coupons/`)
- `GET /coupons/` - Verfügbare Coupons
- `GET /coupons/{id}` - Coupon Details
- `POST /coupons/redeem` - Coupon einlösen
- `GET /categories/` - Coupon-Kategorien
- `GET /companies/` - Firmen

#### Notifications (`/api/notifications/`)
- `POST /devices/register` - FCM Token registrieren
- `GET /notifications/user/{user_id}` - Benachrichtigungen
- `PUT /notifications/{id}/read` - Als gelesen markieren

### Axios Setup (Empfohlen)

```typescript
// services/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Auto-add JWT token
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      
      if (refreshToken) {
        const response = await axios.post(
          'http://localhost:8000/api/auth/refresh',
          { refresh_token: refreshToken }
        );
        
        const { access_token, refresh_token: newRefresh } = response.data;
        await AsyncStorage.setItem('access_token', access_token);
        await AsyncStorage.setItem('refresh_token', newRefresh);
        
        error.config.headers.Authorization = `Bearer ${access_token}`;
        return api(error.config);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

## 🔐 Sicherheit

- **JWT Secret**: Siehe `.env` - `JWT_SECRET`
- **Token Ablauf**: Access Token = 30 Minuten, Refresh Token = 7 Tage
- **Alle Endpoints** außer `/register` und `/token` benötigen Bearer Token
- **CORS**: Konfiguriert für `localhost:8081`, `localhost:19006`

## 🐛 Bekannte Probleme

1. **Alembic nicht initialisiert** in reporting/gamification/coupons/notification Services
2. **Firebase Credentials** fehlen in `.env` (für Push Notifications)
3. **Tests** können erst nach Service-Start ausgeführt werden

## 📋 Nächste Schritte

1. **Dienste starten** (siehe Lösung oben)
2. **Tabellen erstellen** mit Alembic oder manuell
3. **Seed-Daten** einfügen (siehe `SCHEMA_UPDATE.md`)
4. **Tests ausführen** mit `./run_tests.sh`
5. **Frontend verbinden** mit Axios-Setup

## 📞 API Testen mit curl

```bash
# 1. Registrieren
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass123","full_name":"Test User"}'

# 2. Login
curl -X POST http://localhost:8000/api/auth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@test.com&password=pass123"

# 3. Mit Token verwenden (TOKEN_HIER ersetzen)
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer TOKEN_HIER"
```

## 📦 Erforderliche npm Packages (Frontend)

```bash
npm install axios @react-native-async-storage/async-storage
```

## 🎯 Zusammenfassung

- ✅ **Keine API-Keys!** Nur JWT-Token-basierte Authentifizierung
- ✅ **Alle Services konfiguriert** und bereit
- ⚠️  **Alembic muss repariert werden** oder ohne Migrations laufen
- ✅ **Vollständige Dokumentation** in `FRONTEND_INTEGRATION.md`
- ✅ **Test-Suite erstellt** in jedem Service

---

**Gateway URL**: `http://localhost:8000`  
**RabbitMQ Management**: `http://localhost:15672` (kashif/kashif123)  
**Database**: PostgreSQL (kashif/kashif123)
