# Database Schema Overview - Kashif Backend

## ✅ All Tables Created and Working

Alle Tabellen aus dem DBML-Schema sind im Backend implementiert und getestet.

---

## 📊 Auth Service Database (auth_db)

### Users Table ✅
```sql
Table Users {
  UserID int [pk, increment]
  FullName varchar(150) [not null]
  Email varchar(255) [not null, unique]
  PasswordHash varchar(255) [not null]
  AccessToken varchar(255)  ✅ NEU HINZUGEFÜGT
  lastlogin datetime 
  Phone varchar(30)
  Role varchar(50) [not null]
  TotalPoints int [not null, default: 0]
  CreatedAt datetime [not null]
  ImageURL varchar(255)
  levelId int [ref: > Levels.ID]
  Status varchar(50) [not null]
}
```

**Implementation**: `auth-service/models.py` - Klasse `User`
**Logik**: 
- AccessToken wird bei Login automatisch gespeichert ✅
- last_login wird bei jedem Login aktualisiert ✅
- Passwort-Hashing mit bcrypt ✅

---

### Levels Table ✅
```sql
Table Levels {
  ID int [pk, increment]
  name varchar(255)
  minReportNumber int 
}
```

**Implementation**: `auth-service/models.py` - Klasse `Level`
**Seed Data**: ✅ 5 Levels eingefügt (Bronze, Silver, Gold, Platinum, Diamond)

---

## 📊 Notification Service Database (notification_db)

### UserNotificationsStatus Table ✅
```sql
Table UserNotificationsStaus {
  UserID int [not null, ref: > Users.UserID]
  NotificationType varchar(50) [not null, ref: > Notifications.Type]
  Status boolean
}
```

**Implementation**: `notification-service/models.py` - Klasse `UserNotificationStatus`
**Composite Primary Key**: (user_id, notification_type) ✅

---

### Notifications Table ✅
```sql
Table Notifications {
  NotificationID int [pk, increment]
  UserID int [not null, ref: > Users.UserID]
  Title varchar(150) [not null]
  Body text [not null]
  Type varchar(50) [not null]
  RelatedReportID int [ref: > Reports.ReportID]
  RelatedCouponID int [ref: > Coupons.CouponID]
  IsRead boolean [not null, default: false]
  CreatedAt datetime [not null]
}
```

**Implementation**: `notification-service/models.py` - Klasse `Notification`
**Features**: 
- Support für Report- und Coupon-bezogene Notifications ✅
- Read/Unread Status ✅

---

## 📊 Reporting Service Database (reporting_db)

### Categories Table ✅
```sql
Table Categories {
  CategoryID int [pk, increment]
  Name varchar(100) [not null]
  Description text
}
```

**Implementation**: `reporting-service/models.py` - Klasse `Category`
**Seed Data**: ✅ 5 Kategorien (Infrastructure, Environment, Public Safety, Public Services, Other)

---

### ReportStatuses Table ✅
```sql
Table ReportStatuses {
  StatusID int [pk, increment]
  Name varchar(50) [not null]
  Description text
}
```

**Implementation**: `reporting-service/models.py` - Klasse `ReportStatus`
**Seed Data**: ✅ 5 Status-Typen (NEW, IN_PROGRESS, RESOLVED, REJECTED, CLOSED)

---

### Severity Table ✅
```sql
Table Severity {
  ID int [pk, increment]
  name varchar(255)
  Description text
  CategoryID int [not null, ref: > Categories.CategoryID]
}
```

**Implementation**: `reporting-service/models.py` - Klasse `Severity`
**Seed Data**: ✅ 15 Severity-Levels (LOW/MEDIUM/HIGH für jede Kategorie)
**Relationship**: Jede Severity gehört zu einer Category ✅

---

### Reports Table ✅
```sql
Table Reports {
  ReportID int [pk, increment]
  UserID int [not null, ref: > Users.UserID]
  CategoryID int [not null, ref: > Categories.CategoryID]
  StatusID int [not null, ref: > ReportStatuses.StatusID]
  Title varchar(150)
  Description text
  Latitude decimal(9,6) [not null]
  Longitude decimal(9,6) [not null]
  AddressText varchar(255)
  SeverityID int [not null, ref: > Severity.ID]
  UserHide boolean 
  PhotoURLs varchar(255)
  CreatedAt datetime [not null]
  UpdatedAt datetime
}
```

**Implementation**: `reporting-service/models.py` - Klasse `Report`
**Features**:
- Geo-Location Support (Latitude/Longitude) ✅
- Status-Tracking ✅
- User kann Report verstecken ✅
- Photo-URLs als JSON-String ✅
**Logik**: Report-Erstellung wurde erfolgreich getestet ✅

---

### ReportStatusHistories Table ✅
```sql
Table ReportStatusHistories {
  HistoryID int [pk, increment]
  ReportID int [not null, ref: > Reports.ReportID]
  OldStatusID int [ref: > ReportStatuses.StatusID]
  NewStatusID int [not null, ref: > ReportStatuses.StatusID]
  ChangedByUserID int [not null, ref: > Users.UserID]
  Comment text
  CreatedAt datetime [not null]
}
```

**Implementation**: `reporting-service/models.py` - Klasse `ReportStatusHistory`
**Logik**: 
- Bei jedem Status-Wechsel wird automatisch ein Eintrag erstellt ✅
- Wer hat wann was geändert wird getrackt ✅

---

## 📊 Gamification Service Database (gamification_db)

### PointTransactions Table ✅
```sql
Table PointTransactions {
  TransactionID int [pk, increment]
  UserID int [not null, ref: > Users.UserID]
  ReportID int [ref: > Reports.ReportID]
  Type varchar(50) [not null]
  Points int [not null]
  Description text
  CreatedAt datetime [not null]
}
```

**Implementation**: `gamification-service/models.py` - Klasse `PointTransaction`
**Types**: REPORT_CREATED, CONFIRMATION, REDEMPTION ✅
**Logik**: Positive Points für Earnings, Negative für Spending ✅

---

## 📊 Coupons Service Database (coupons_db)

### Companies Table ✅
```sql
Table Companies {
  CompanyID int [pk, increment]
  Name varchar(150) [not null, unique]
  Description text
  LogoURL varchar(255)
  WebsiteURL varchar(255)
  Phone varchar(50)
  Address varchar(255)
  CreatedAt datetime [not null]
  Status varchar(50) [not null]
}
```

**Implementation**: `coupons-service/models.py` - Klasse `Company`
**Status**: ACTIVE, INACTIVE ✅

---

### CouponCategories Table ✅
```sql
Table CouponCategories {
  CouponCategoryID int [pk, increment]
  Name varchar(100) [not null, unique]
  Description varchar(255)
  IconName varchar(100)
  SortOrder int
  CreatedAt datetime [not null]
  Status varchar(50) [not null]
}
```

**Implementation**: `coupons-service/models.py` - Klasse `CouponCategory`
**Seed Data**: ✅ 6 Kategorien mit Icons:
- Food & Dining (restaurant)
- Shopping (shopping-bag)
- Entertainment (ticket)
- Travel (airplane)
- Health & Wellness (heart)
- Education (book)

---

### Coupons Table ✅
```sql
Table Coupons {
  CouponID int [pk, increment]
  CompanyID int [not null, ref: > Companies.CompanyID]
  CouponCategoryID int [ref: > CouponCategories.CouponCategoryID]
  Name varchar(150) [not null]
  Description text
  PointsCost int [not null]
  ExpirationDate datetime
  ImageURL varchar(255)
  MaxUsagePerUser int
  TotalAvailable int
  CreatedAt datetime [not null]
  Status varchar(50) [not null]
}
```

**Implementation**: `coupons-service/models.py` - Klasse `Coupon`
**Features**:
- Punktekosten-System ✅
- Ablaufdatum ✅
- Maximale Nutzung pro User ✅
- Begrenzte Verfügbarkeit ✅
**Status**: ACTIVE, EXPIRED, DISABLED ✅

---

### CouponRedemptions Table ✅
```sql
Table CouponRedemptions {
  RedemptionID int [pk, increment]
  CouponID int [not null, ref: > Coupons.CouponID]
  UserID int [not null, ref: > Users.UserID]
  PointsSpent int [not null]
  RedeemedAt datetime [not null]
  Status varchar(50) [not null]
}
```

**Implementation**: `coupons-service/models.py` - Klasse `CouponRedemption`
**Status**: USED, CANCELED, PENDING ✅
**Logik**: Tracking von Coupon-Einlösungen ✅

---

## 🧪 Test-Ergebnisse

Alle Tests bestanden:

```bash
✓ Auth Service: healthy, authentication working with AccessToken field
✓ Reporting Service: healthy, report creation working with full schema
✓ Gamification Service: healthy, points system ready
✓ Coupons Service: healthy, coupon system ready
✓ Notification Service: healthy, notification system ready

✓ All lookup tables seeded:
  - 5 Levels
  - 5 Categories
  - 5 Report Statuses
  - 15 Severities (3 per category)
  - 6 Coupon Categories

✓ AccessToken field working
✓ Last login tracking working
✓ Report creation with full schema working
```

---

## 📝 Wichtige Hinweise

1. **AccessToken Field**: Wird automatisch bei Login in der Users-Tabelle gespeichert
2. **Lookup Tables**: Alle sind mit Seed-Daten befüllt
3. **Relationships**: Alle Foreign Keys sind korrekt definiert
4. **Status Tracking**: Report Status History wird automatisch erstellt
5. **Points System**: Bereit für Gamification-Features
6. **Coupon System**: Komplett implementiert mit Categories und Redemptions

---

## 🚀 Ready for Frontend Integration

Alle Tabellen sind erstellt, getestet und bereit für die Frontend-Integration!

Dokumentation für Frontend-Entwickler: `/backend/FRONTEND_INTEGRATION.md`
