# Kashif (كاشف) — Feature-Übersicht & Roadmap

## Projektbeschreibung

**Kashif** ist eine Community-basierte Straßenschaden-Melde-App für den arabischen Raum. Bürger melden Schlaglöcher, Unfälle, Blitzer und weitere Gefahren per Foto + GPS und werden mit Punkten belohnt, die gegen Coupons eingelöst werden können. Die App warnt Fahrer automatisch bei Annäherung an gemeldete Gefahrenstellen.

**Plattformen:** iOS, Android (Expo/React Native), Admin-Panel (Next.js), Backend (Python/FastAPI Microservices)

---

## ✅ Vorhandene Features

### Mobile App
- Kartenbasierte Gefahrenmeldung (Google Maps + GPS) mit Foto-Upload
- KI-Schlagloch-Erkennung (YOLOv8/Roboflow)
- Echtzeit-GPS-Warnung bei Annäherung (200m Radius, Audio + Vibration)
- Punkte-System (+10 Meldung, +20 Bestätigung, +5 Gelöst)
- Level-System (Bronze → Silber → Gold → Platin → Diamant)
- Coupon-Einlösung mit QR-Code-Verifizierung
- Push-Notifications (Firebase Cloud Messaging)
- Offline-Unterstützung (Meldungen werden lokal gespeichert)
- Arabisch/Englisch mit vollständigem RTL/LTR-Support
- Passwort-Reset per Verifizierungscode
- Standortüberwachungs-Einstellungen

### Admin-Panel
- Benutzer-Verwaltung (CRUD, Rollen, Status, Punkte vergeben)
- Meldungs-Verwaltung (Status ändern, auf Karte anzeigen)
- Coupon-Verwaltung (erstellen, bearbeiten, löschen, Bilder)
- Analytics-Dashboard (Statistiken, Diagramme, Leaderboard)
- Unternehmens-Ansicht (firmeneigene Coupon-Analytics)
- Team-Verwaltung
- Mehrsprachig mit RTL-Layout (Arabisch/Englisch)

### Backend (6 Microservices)
- **Auth-Service** — Registrierung, Login, JWT-Token, Passwort-Reset
- **Reporting-Service** — Meldungen CRUD, Kategorien, GPS-Daten, Bildverwaltung
- **Gamification-Service** — Punkte, Level, Leaderboard, Punkte-Vergabe
- **Coupons-Service** — Coupons CRUD, QR-Code-Einlösung, Firmenzugehörigkeit
- **Notification-Service** — FCM Push-Notifications, Standort-basierte Warnungen
- **Pothole-Detection** — KI-Bilderkennung (YOLOv8/Roboflow)
- **Gateway** — Nginx Reverse-Proxy, SSL, Routing
- **Message-Broker** — RabbitMQ für Event-basierte Kommunikation

---

## 🔴 Must-Have Features (Empfohlen)

### 1. Sicherheit & Authentifizierung

#### 1.1 Rate-Limiting & API-Schutz
- **Priorität:** KRITISCH
- API Rate-Limiting (z. B. 100 Requests/Minute pro User)
- Brute-Force-Schutz für Login-Endpunkte (max. 5 Versuche → Lockout)
- Request-Validierung und Input-Sanitization auf allen Endpunkten
- CORS richtig konfigurieren (nur erlaubte Origins)

#### 1.2 Refresh-Token-System
- **Priorität:** HOCH
- Access-Token mit kurzer Laufzeit (15 Min)
- Refresh-Token mit langer Laufzeit (30 Tage)
- Token-Rotation bei jeder Refresh-Anfrage
- Server-seitiges Token-Blacklisting bei Logout

#### 1.3 Account-Verifizierung
- **Priorität:** HOCH
- E-Mail-Verifizierung bei der Registrierung
- SMS-Verifizierung (OTP) als Alternative
- Verhindert Spam-Accounts und Fake-Meldungen

---

### 2. Meldungs-Qualität & Moderation

#### 2.1 Meldungs-Bestätigung durch andere Nutzer
- **Priorität:** HOCH
- Andere Nutzer können eine Meldung bestätigen ("Ich habe das auch gesehen")
- Bestätigungs-Counter auf jeder Meldung
- Meldungen mit mehr Bestätigungen werden priorisiert
- Punkte für den Bestätiger (+5 Punkte)

#### 2.2 Duplikat-Erkennung
- **Priorität:** HOCH
- GPS-Radius-Check: Warnung, wenn innerhalb von 50m bereits eine Meldung existiert
- Verhindert doppelte Meldungen für denselben Schaden
- Option: "Bestehende Meldung bestätigen" statt neue erstellen

#### 2.3 Bild-Qualitätsprüfung
- **Priorität:** MITTEL
- Minimale Auflösung prüfen
- Unscharfe/dunkle Bilder ablehnen
- EXIF-Daten für GPS-Verifizierung nutzen (Bild-GPS ≈ Meldungs-GPS?)

#### 2.4 Meldungs-Verlauf & Statusverfolgung
- **Priorität:** HOCH
- Nutzer sieht alle eigenen Meldungen und deren Status
- Push-Notification wenn Status sich ändert (Eingereicht → In Bearbeitung → Gelöst)
- Vorher/Nachher-Vergleich bei gelösten Meldungen

---

### 3. Nutzer-Erlebnis & Engagement

#### 3.1 Profilbild-Upload zum Server
- **Priorität:** HOCH
- Aktuell nur lokal gespeichert — geht bei App-Neuinstallation verloren
- Backend-Endpunkt für Profilbild-Upload/-Download
- Bild-Kompression auf Client-Seite

#### 3.2 Suchfunktion & Filter
- **Priorität:** HOCH
- Meldungen nach Kategorie filtern (Schlagloch, Unfall, Blitzer, etc.)
- Nach Status filtern (Offen, In Bearbeitung, Gelöst)
- Nach Datum/Zeitraum filtern
- Textsuche in Meldungsbeschreibungen

#### 3.3 In-App-Feedback-System
- **Priorität:** MITTEL
- Nutzer können Feedback oder Probleme direkt aus der App melden
- "Diesen Bericht melden" für unangemessene Inhalte
- Kontaktformular zum Support-Team

#### 3.4 Onboarding-Tutorial
- **Priorität:** MITTEL
- Erste-Schritte-Anleitung bei der erstmaligen Nutzung
- Erklärt Meldungen erstellen, Punkte sammeln, Coupons einlösen
- Überspringbar für erfahrene Nutzer

---

### 4. Karten-Verbesserungen

#### 4.1 Cluster-Darstellung
- **Priorität:** HOCH
- Viele Marker auf engem Raum zu Clustern zusammenfassen
- Zahl im Cluster zeigt Anzahl der Meldungen
- Beim Reinzoomen aufklappen
- Verbessert Performance und Übersichtlichkeit massiv

#### 4.2 Heatmap-Ansicht
- **Priorität:** MITTEL
- Gefahrenzonen farblich hervorheben (Rot = viele Meldungen)
- Toggle zwischen normaler und Heatmap-Ansicht
- Hilft Behörden, Schwerpunkte zu erkennen

#### 4.3 Routenwarnung
- **Priorität:** HOCH
- Nutzer gibt Start und Ziel ein
- App zeigt alle Gefahren auf der Route an
- Warnt aktiv während der Fahrt auf der Route

---

### 5. Benachrichtigungen & Kommunikation

#### 5.1 Granulare Notification-Einstellungen ✅
- **Priorität:** HOCH
- **Status:** Implementiert (ea2def1)
- Nutzer wählt, welche Benachrichtigungen er erhalten möchte:
  - ☑ Neue Meldungen in meiner Nähe
  - ☑ Status-Updates meiner Meldungen
  - ☑ Neue Coupons verfügbar
  - ☑ Level-Aufstieg / Punkte
  - ☑ Allgemeine Benachrichtigungen
- Ruhezeiten konfigurierbar (22:00–07:00 keine Notifications)
- Backend: GET/PUT /api/notifications/preferences, FCM-Filter, Quiet-Hours-Check
- Mobile: 5 Toggles + Ruhezeiten-Picker in Einstellungen

#### 5.2 Status-Update-Notifications ✅
- **Priorität:** HOCH
- **Status:** Implementiert (ea2def1)
- Automatische Push-Notification bei Statusänderung eigener Meldungen
- Bilinguale Notifications (Deutsch + Englisch, title_en/body_en)
- Deep-Link direkt zur betroffenen Meldung (reportId Query-Parameter)
- Notification-Tap öffnet automatisch das Report-Detail

---

### 6. Gamification-Erweiterungen

#### 6.1 Achievements / Badges
- **Priorität:** MITTEL
- "Erste Meldung", "10 Meldungen", "100 Meldungen"
- "Nachtmelder" (Meldung zwischen 22–06 Uhr)
- "Bestätiger" (10 Meldungen bestätigt)
- "Schlagloch-Jäger" (50 Schlaglöcher gemeldet)
- Anzeige im Profil als Badge-Sammlung

#### 6.2 Wöchentliche Challenges
- **Priorität:** MITTEL
- "Melde diese Woche 5 Gefahren" → Bonus-Punkte
- "Bestätige 3 Meldungen anderer Nutzer"
- Rotation von Challenges jede Woche
- Hält Nutzer langfristig aktiv

#### 6.3 Freunde & Soziale Features
- **Priorität:** NIEDRIG
- Freundesliste
- Leaderboard unter Freunden
- Meldungen an Freunde teilen

---

### 7. Offline & Performance

#### 7.1 Vollständiger Offline-Modus ✅
- **Priorität:** HOCH
- **Status:** Implementiert (ea2def1)
- Daten-Caching (Nearby Reports, User Reports, Map Region)
- Sync-Queue mit exponentiellem Backoff (max 5 Retries)
- Automatischer Sync bei Internetverbindung + alle 2 Minuten
- Offline-Näherungswarnung basierend auf gecachten Gefahrenstellen (Haversine)
- Animiertes Offline-Banner mit Pending-Count
- OfflineContext als globaler Provider

#### 7.2 App-Performance-Optimierung
- **Priorität:** HOCH
- Karten-Marker lazy loading (nur sichtbarer Bereich)
- Bild-Caching und Thumbnail-Generierung
- Pagination für lange Listen (Meldungen, Leaderboard)
- Bundle-Size-Optimierung

---

### 8. Admin-Panel-Erweiterungen

#### 8.1 Bulk-Operationen
- **Priorität:** HOCH
- Mehrere Meldungen gleichzeitig als "Gelöst" markieren
- Mehrere Nutzer gleichzeitig aktivieren/deaktivieren
- CSV/Excel-Export von Meldungen und Statistiken

#### 8.2 Erweitertes Dashboard
- **Priorität:** MITTEL
- Tagesvergleich / Wochenvergleich der Meldungen
- Durchschnittliche Lösungszeit pro Kategorie
- Geographische Verteilung (Karte mit Heatmap)
- Top-Melder des Monats

#### 8.3 Rollen & Berechtigungen
- **Priorität:** HOCH
- Differenzierte Admin-Rollen (Super-Admin, Moderator, Viewer)
- Moderator kann nur Meldungen bearbeiten, nicht löschen
- Viewer hat nur Lese-Zugriff auf Analytics
- Audit-Log: Wer hat was wann geändert?

---

### 9. Infrastruktur & DevOps

#### 9.1 CI/CD-Pipeline ✅
- **Priorität:** HOCH
- **Status:** Implementiert
- Automatisierte Tests bei jedem Push (GitHub Actions)
- Matrix-basierte Tests für alle 5 Microservices (pytest + PostgreSQL)
- Docker-Build-Verifizierung für alle Services
- Automatisches Deployment via SSH (git pull → docker compose build → up)
- Health-Checks nach Deployment

#### 9.2 Monitoring & Alerting ✅
- **Priorität:** HOCH
- **Status:** Implementiert
- Detaillierte Health-Checks für alle Services (/health/detailed: DB + RabbitMQ)
- Response-Time-Monitoring (ms) pro Service
- Docker-Healthchecks mit Auto-Restart (interval=30s, retries=3)
- E-Mail-Alerting bei Service-Ausfall/Recovery (monitor.py, Cron alle 2 Min)
- Admin-Monitoring-Dashboard (Live-Status, Auto-Refresh, AR/EN)

#### 9.3 Automatisierte Backups
- **Priorität:** KRITISCH
- Tägliche PostgreSQL-Backups (automatisiert)
- Backup-Rotation (7 Tage lokal, 30 Tage remote)
- Backup-Restore regelmäßig testen
- Bild-Backups aller hochgeladenen Fotos

#### 9.4 Logging-System ✅
- **Priorität:** HOCH
- **Status:** Implementiert
- Strukturierte JSON-Logs in allen 5 Services (json_logger.py)
- Request-ID-Tracing über alle Requests (logging_middleware.py)
- Docker-Log-Rotation (json-file, max 10MB × 5 Dateien pro Service)
- Log-Felder: timestamp, level, service, request_id, module, function, line, exception

---

### 10. Datenschutz & Compliance

#### 10.1 DSGVO / Datenschutz
- **Priorität:** KRITISCH
- Datenschutzerklärung in der App
- Nutzer kann eigene Daten exportieren
- Nutzer kann Account und alle Daten löschen ("Recht auf Vergessenwerden")
- Einwilligungs-Management für Standortdaten und Benachrichtigungen

#### 10.2 Nutzungsbedingungen
- **Priorität:** HOCH
- AGB bei Registrierung anzeigen und akzeptieren lassen
- Richtlinien für Meldungsinhalte (keine beleidigenden Inhalte)
- Versionierung der AGB mit Neuakzeptierung bei Änderungen

---

## Priorisierungs-Matrix

| Priorität | Feature | Aufwand |
|-----------|---------|---------|
| 🔴 KRITISCH | Rate-Limiting & API-Schutz | Mittel |
| 🔴 KRITISCH | Automatisierte Backups | Mittel |
| 🔴 KRITISCH | Datenschutz (DSGVO) | Hoch |
| 🟠 HOCH | Refresh-Token-System | Mittel |
| 🟠 HOCH | Account-Verifizierung | Mittel |
| 🟠 HOCH | Meldungs-Bestätigung | Mittel |
| 🟠 HOCH | Duplikat-Erkennung | Mittel |
| 🟠 HOCH | Meldungs-Statusverfolgung | Niedrig |
| 🟠 HOCH | Profilbild-Server-Upload | Niedrig |
| 🟠 HOCH | Suchfunktion & Filter | Mittel |
| 🟠 HOCH | Marker-Clustering | Mittel |
| 🟠 HOCH | Routenwarnung | Hoch |
| ✅ HOCH | Notification-Einstellungen | Mittel |
| ✅ HOCH | Status-Update-Notifications | Niedrig |
| ✅ HOCH | Vollständiger Offline-Modus | Hoch |
| ✅ HOCH | Performance-Optimierung | Mittel |
| ✅ HOCH | Bulk-Operationen (Admin) | Mittel |
| ✅ HOCH | Admin-Rollen & Berechtigungen | Hoch |
| ✅ HOCH | CI/CD-Pipeline | Hoch |
| ✅ HOCH | Monitoring & Alerting | Mittel |
| ✅ HOCH | Logging-System | Mittel |

| 🟠 HOCH | Nutzungsbedingungen | Niedrig |
| 🟡 MITTEL | Bild-Qualitätsprüfung | Mittel |
| 🟡 MITTEL | In-App-Feedback | Niedrig |

| 🟡 MITTEL | Onboarding-Tutorial | Mittel |
| 🟡 MITTEL | Heatmap-Ansicht | Mittel |
| 🟡 MITTEL | Achievements / Badges | Mittel |

| 🟡 MITTEL | Wöchentliche Challenges | Hoch |
| 🟡 MITTEL | Erweitertes Dashboard | Mittel |
| 🟢 NIEDRIG | Freunde & Soziale Features | Hoch |
