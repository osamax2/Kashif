# Punktesystem Update - Automatische total_points Berechnung

## Problem
Die `total_points` im User-Modell (Auth-Service) wurden nicht automatisch aktualisiert, wenn ein Benutzer einen Report erstellt hat.

## Lösung
Implementierung eines Event-basierten Systems über RabbitMQ:

### Workflow:
```
1. User erstellt Report
   ↓
2. Reporting Service publiziert "report.created" Event
   ↓
3. Gamification Service empfängt Event
   ↓
4. Gamification Service erstellt PointTransaction (+10 Punkte)
   ↓
5. Gamification Service publiziert "points.transaction.created" Event
   ↓
6. Auth Service empfängt Event
   ↓
7. Auth Service aktualisiert user.total_points in Datenbank
```

## Geänderte Dateien:

### 1. `/Backend/auth-service/rabbitmq_consumer.py` (NEU)
- Neuer RabbitMQ Consumer für Auth-Service
- Hört auf `points.transaction.created` Events
- Aktualisiert `user.total_points` wenn Punkte vergeben werden

### 2. `/Backend/auth-service/crud.py`
- Neue Funktion: `update_user_total_points(db, user_id, points_to_add)`
- Addiert Punkte zu vorhandenem total_points
- Speichert in Datenbank

### 3. `/Backend/auth-service/main.py`
- Import von `rabbitmq_consumer`
- Startet Consumer Thread beim App-Start
- Consumer läuft im Hintergrund

### 4. `/Backend/gamification-service/rabbitmq_consumer.py`
- `handle_report_created()`: Publiziert jetzt zusätzlich `points.transaction.created` Event
- `handle_report_resolved()`: Publiziert jetzt zusätzlich `points.transaction.created` Event
- Event enthält: user_id, points, transaction_id, transaction_type

## Event-Schema:

### points.transaction.created
```json
{
  "event_type": "points.transaction.created",
  "data": {
    "user_id": 123,
    "points": 10,
    "transaction_id": 456,
    "transaction_type": "REPORT_CREATED"
  }
}
```

## Punkt-Konfiguration:
- **Report erstellt**: +10 Punkte
- **Report gelöst**: +5 Punkte (Bonus)

## Testing:
1. Starte alle Services (auth, reporting, gamification, rabbitmq)
2. Erstelle einen Report in der App
3. Überprüfe Logs:
   - Reporting: "Published ReportCreated event"
   - Gamification: "Awarded 10 points to user X"
   - Gamification: "Published points.transaction.created event"
   - Auth: "Updated total_points for user X"
4. Überprüfe Datenbank:
   - `point_transactions` Tabelle hat neuen Eintrag
   - `users.total_points` wurde aktualisiert

## Deployment:
```bash
cd Backend/auth-service
docker-compose up --build
```

## Voraussetzungen:
- RabbitMQ muss laufen
- Alle Services müssen mit derselben RabbitMQ-Instanz verbunden sein
- Environment Variable: `RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/`

## Vorteile:
✅ Automatische Punkt-Aktualisierung
✅ Event-driven Architecture
✅ Entkoppelte Services
✅ Skalierbar
✅ Fehlertoleranz durch Message Queue
