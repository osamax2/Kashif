# Kashif Backend - Database Schema Update

## Schema-Änderungen Übersicht

Die Backend-Microservices wurden an das neue Datenbankschema angepasst.

### 1. Auth Service

**Neue Tabellen:**
- `levels` - Benutzer-Level basierend auf Anzahl der Berichte
  - ID, name, min_report_number

**Users Tabelle - Neue Felder:**
- `total_points` (INT) - Gesamtpunkte des Benutzers
- `image_url` (VARCHAR 255) - Profilbild URL
- `level_id` (INT) - Referenz zu Levels
- `status` (VARCHAR 50) - ACTIVE, BANNED
- `last_login` (DATETIME) - Letzter Login-Zeitpunkt
- Geändert: `role` zu VARCHAR(50) mit Werten USER, ADMIN

**Entfernt:**
- `is_active` (ersetzt durch `status`)

### 2. Reporting Service

**Neue Tabellen:**
- `categories` - Berichtkategorien
  - CategoryID, Name, Description

- `report_statuses` - Status-Definitionen
  - StatusID, Name (NEW, IN_PROGRESS, RESOLVED, REJECTED), Description

- `severities` - Schweregrad-Definitionen
  - ID, name (LOW, MEDIUM, HIGH), Description, CategoryID

**Reports Tabelle - Änderungen:**
- `category_id` (INT FK) - statt String
- `status_id` (INT FK) - statt String
- `severity_id` (INT FK) - NEU: Schweregrad-Referenz
- `user_hide` (BOOLEAN) - NEU: Benutzer kann Bericht verstecken
- `photo_urls` (TEXT) - statt einzelner `image_url` (JSON/CSV)
- `address_text` (VARCHAR 255) - umbenannt von `address`
- `latitude/longitude` - NUMERIC(9,6) statt FLOAT
- `title` - jetzt NULLABLE

**ReportStatusHistory Tabelle - Änderungen:**
- `old_status_id` (INT FK) - statt String
- `new_status_id` (INT FK) - statt String
- `changed_by_user_id` - umbenannt von `changed_by`

### 3. Gamification Service

**PointTransactions Tabelle - Änderungen:**
- `report_id` (INT) - NEU: Direkte Referenz zu Berichten
- `type` (VARCHAR 50) - umbenannt von `transaction_type`
  - Werte: REPORT_CREATED, CONFIRMATION, REDEMPTION
- Entfernt: `reference_id` (ersetzt durch `report_id`)

### 4. Coupons Service

**Neue Tabellen:**
- `coupon_categories` - Coupon-Kategorien
  - CouponCategoryID, Name, Description, IconName, SortOrder, Status, CreatedAt

**Companies Tabelle - Neue Felder:**
- `website_url` (VARCHAR 255) - umbenannt von `website`
- `phone` (VARCHAR 50) - NEU: Telefonnummer
- `address` (VARCHAR 255) - NEU: Firmenadresse
- `status` (VARCHAR 50) - ACTIVE, INACTIVE (statt `is_active`)

**Coupons Tabelle - Änderungen:**
- `coupon_category_id` (INT FK) - NEU: Referenz zu coupon_categories
- `name` (VARCHAR 150) - umbenannt von `title`
- `points_cost` (INT) - umbenannt von `points_required`
- `expiration_date` - umbenannt von `expiry_date`
- `max_usage_per_user` (INT) - NEU: Maximale Nutzung pro Benutzer
- `total_available` (INT) - NEU: Verfügbare Gesamtanzahl
- `status` (VARCHAR 50) - ACTIVE, EXPIRED, DISABLED (statt `is_active`)

**Entfernt:**
- `discount_value`, `discount_type`, `terms_conditions`

**CouponRedemptions Tabelle - Änderungen:**
- `status` (VARCHAR 50) - NEU: USED, CANCELED, PENDING
- Entfernt: `redemption_code`, `is_used`, `used_at`

### 5. Notification Service

**Neue Tabellen:**
- `user_notification_status` - Benutzer-Notification-Einstellungen
  - UserID, NotificationType, Status (boolean)

**Notifications Tabelle - Änderungen:**
- `type` (VARCHAR 50) - umbenannt von `notification_type`
  - Werte: WELCOME, REPORT_UPDATE, POINTS_AWARDED, COUPON_REDEEMED
- `related_report_id` (INT) - NEU: Referenz zu Berichten
- `related_coupon_id` (INT) - NEU: Referenz zu Coupons
- `title` - VARCHAR(150) statt unbegrenzt
- Entfernt: `reference_id`, `read_at`

## API-Änderungen

### Auth Service
```bash
# User-Objekt enthält jetzt:
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "John Doe",
  "phone": "+1234567890",
  "role": "USER",
  "total_points": 150,
  "image_url": "https://...",
  "level_id": 2,
  "status": "ACTIVE",
  "last_login": "2025-11-26T10:00:00",
  "created_at": "2025-01-01T00:00:00",
  "updated_at": "2025-11-26T10:00:00"
}
```

### Reporting Service
```bash
# Report erstellen - neue Struktur:
POST /api/reports/
{
  "title": "Street Damage",
  "description": "Large pothole",
  "category_id": 1,          # statt "road_damage" String
  "latitude": 24.713600,
  "longitude": 46.675300,
  "address_text": "Main Street",
  "severity_id": 2,          # NEU
  "photo_urls": "[\"url1\", \"url2\"]"  # statt single image_url
}

# Status Update - neue Struktur:
PATCH /api/reports/{id}/status
{
  "status_id": 2,           # statt "in_progress" String
  "comment": "Working on it"
}
```

### Gamification Service
```bash
# Point Transaction enthält jetzt:
{
  "id": 1,
  "user_id": 10,
  "report_id": 5,           # NEU
  "type": "REPORT_CREATED", # statt "report_created"
  "points": 10,
  "description": "Created report #5",
  "created_at": "2025-11-26T10:00:00"
}
```

### Coupons Service
```bash
# Coupon-Objekt jetzt:
{
  "id": 1,
  "company_id": 1,
  "coupon_category_id": 1,  # NEU
  "name": "20% Discount",
  "description": "...",
  "points_cost": 100,       # statt points_required
  "expiration_date": "2025-12-31T00:00:00",
  "image_url": "https://...",
  "max_usage_per_user": 3,  # NEU
  "total_available": 1000,  # NEU
  "status": "ACTIVE",
  "created_at": "2025-01-01T00:00:00"
}

# Redemption jetzt:
{
  "id": 1,
  "user_id": 10,
  "coupon_id": 1,
  "points_spent": 100,
  "status": "PENDING",      # NEU: USED, CANCELED, PENDING
  "redeemed_at": "2025-11-26T10:00:00"
}
```

### Notification Service
```bash
# Notification-Objekt jetzt:
{
  "id": 1,
  "user_id": 10,
  "title": "New Report",
  "body": "Your report was received",
  "type": "REPORT_UPDATE",  # statt notification_type
  "related_report_id": 5,   # NEU
  "related_coupon_id": null,# NEU
  "is_read": false,
  "created_at": "2025-11-26T10:00:00"
}
```

## Migration Steps

### 1. Datenbank-Initialisierung

Jeder Service benötigt neue Migrationen:

```bash
# Auth Service
cd backend/auth-service
alembic revision --autogenerate -m "Add levels and update users"
alembic upgrade head

# Reporting Service
cd backend/reporting-service
alembic revision --autogenerate -m "Add categories, statuses, severities"
alembic upgrade head

# Gamification Service
cd backend/gamification-service
alembic revision --autogenerate -m "Update point transactions"
alembic upgrade head

# Coupons Service
cd backend/coupons-service
alembic revision --autogenerate -m "Add coupon categories, update schema"
alembic upgrade head

# Notification Service
cd backend/notification-service
alembic revision --autogenerate -m "Add user notification status, update notifications"
alembic upgrade head
```

### 2. Seed-Daten

Erstellen Sie Seed-Daten für:

**Categories (Reporting Service):**
```sql
INSERT INTO categories (name, description) VALUES
('road_damage', 'Straßenschäden'),
('waste', 'Abfall und Müll'),
('pollution', 'Umweltverschmutzung'),
('lighting', 'Straßenbeleuchtung');
```

**ReportStatuses (Reporting Service):**
```sql
INSERT INTO report_statuses (name, description) VALUES
('NEW', 'Neu eingegangen'),
('IN_PROGRESS', 'In Bearbeitung'),
('RESOLVED', 'Gelöst'),
('REJECTED', 'Abgelehnt');
```

**Severities (Reporting Service):**
```sql
INSERT INTO severities (name, description, category_id) VALUES
('LOW', 'Niedriger Schweregrad', 1),
('MEDIUM', 'Mittlerer Schweregrad', 1),
('HIGH', 'Hoher Schweregrad', 1);
```

**Levels (Auth Service):**
```sql
INSERT INTO levels (name, min_report_number) VALUES
('Bronze', 0),
('Silver', 10),
('Gold', 50),
('Platinum', 100);
```

**CouponCategories (Coupons Service):**
```sql
INSERT INTO coupon_categories (name, description, icon_name, sort_order, status) VALUES
('food', 'Food & Beverages', 'restaurant', 1, 'ACTIVE'),
('shopping', 'Shopping', 'shopping_cart', 2, 'ACTIVE'),
('entertainment', 'Entertainment', 'movie', 3, 'ACTIVE');
```

## Event Types Aktualisiert

Event-Namen bleiben gleich, aber Payload enthält neue IDs:

- `user.registered` - enthält `user_id`, `email`, `role` (USER/ADMIN)
- `report.created` - enthält `report_id`, `user_id`, `category_id`, `severity_id`
- `report.status_updated` - enthält `report_id`, `old_status_id`, `new_status_id`
- `points.awarded` - enthält `user_id`, `points`, `type` (REPORT_CREATED/CONFIRMATION)
- `coupon.redeemed` - enthält `user_id`, `coupon_id`, `points_spent`

## Nächste Schritte

1. Führen Sie die Migrationen aus
2. Erstellen Sie Seed-Daten
3. Testen Sie die APIs mit Postman/cURL
4. Aktualisieren Sie die Mobile App, um neue API-Struktur zu verwenden
5. Dokumentieren Sie Frontend-Änderungen

## Kompatibilität

⚠️ **Breaking Changes**: Diese Updates sind nicht rückwärtskompatibel. Die Mobile App muss angepasst werden.
