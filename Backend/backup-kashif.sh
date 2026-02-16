#!/bin/bash
# ============================================================
# Kashif Backend — Automatisiertes Backup-Script
# ============================================================
# Erstellt tägliche Backups aller 5 PostgreSQL-Datenbanken
# und der hochgeladenen Bilder (Reporting-Uploads).
#
# Aufbewahrung: 7 Tage (ältere werden automatisch gelöscht)
# Empfohlener Cron: 0 3 * * * /root/backup-kashif.sh
# ============================================================

set -euo pipefail

# --- Konfiguration ---
BACKUP_DIR="/root/kashif-backups"
LOG_FILE="/var/log/kashif-backup.log"
RETENTION_DAYS=7
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DAILY_DIR="${BACKUP_DIR}/${TIMESTAMP}"

# Reporting-Uploads (Docker Volume)
UPLOADS_VOLUME="/var/lib/docker/volumes/backend_reporting_uploads/_data"

# --- Datenbank-Definitionen ---
# Format: container_name:db_name:db_user
DATABASES=(
    "kashif-auth-db:kashif_auth:kashif_auth"
    "kashif-reporting-db:kashif_reports:kashif_reports"
    "kashif-gamification-db:kashif_gamification:kashif_gamif"
    "kashif-coupons-db:kashif_coupons:kashif_coupons"
    "kashif-notification-db:kashif_notifications:kashif_notif"
)

# --- Funktionen ---
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error_exit() {
    log "FEHLER: $1"
    # Benachrichtigung könnte hier hinzugefügt werden (z.B. E-Mail)
    exit 1
}

check_container() {
    if ! docker ps --format '{{.Names}}' | grep -q "^${1}$"; then
        log "WARNUNG: Container '$1' läuft nicht — überspringe"
        return 1
    fi
    return 0
}

# --- Hauptprogramm ---
log "=========================================="
log "Kashif Backup gestartet"
log "=========================================="

# Backup-Verzeichnis erstellen
mkdir -p "$DAILY_DIR"
log "Backup-Verzeichnis: $DAILY_DIR"

# Zähler für Erfolg/Fehler
SUCCESS=0
FAILED=0
TOTAL=${#DATABASES[@]}

# --- Datenbank-Backups ---
log "--- Datenbank-Backups (${TOTAL} DBs) ---"

for db_entry in "${DATABASES[@]}"; do
    IFS=':' read -r container db_name db_user <<< "$db_entry"
    
    backup_file="${DAILY_DIR}/${db_name}_${TIMESTAMP}.sql.gz"
    
    if ! check_container "$container"; then
        FAILED=$((FAILED + 1))
        continue
    fi
    
    log "Backup: ${db_name} (Container: ${container})"
    
    if docker exec "$container" pg_dump -U "$db_user" -d "$db_name" --clean --if-exists 2>>"$LOG_FILE" | gzip > "$backup_file"; then
        SIZE=$(du -sh "$backup_file" | cut -f1)
        log "  ✓ ${db_name} — ${SIZE}"
        SUCCESS=$((SUCCESS + 1))
    else
        log "  ✗ ${db_name} — FEHLGESCHLAGEN"
        rm -f "$backup_file"
        FAILED=$((FAILED + 1))
    fi
done

log "Datenbanken: ${SUCCESS}/${TOTAL} erfolgreich"

# --- Upload-Bilder Backup ---
log "--- Uploads-Backup ---"

if [ -d "$UPLOADS_VOLUME" ]; then
    uploads_file="${DAILY_DIR}/reporting_uploads_${TIMESTAMP}.tar.gz"
    UPLOAD_COUNT=$(find "$UPLOADS_VOLUME" -type f 2>/dev/null | wc -l)
    
    log "Uploads: ${UPLOAD_COUNT} Dateien"
    
    if tar -czf "$uploads_file" -C "$UPLOADS_VOLUME" . 2>>"$LOG_FILE"; then
        SIZE=$(du -sh "$uploads_file" | cut -f1)
        log "  ✓ Uploads — ${SIZE}"
    else
        log "  ✗ Uploads — FEHLGESCHLAGEN"
        rm -f "$uploads_file"
    fi
else
    log "WARNUNG: Uploads-Verzeichnis nicht gefunden: $UPLOADS_VOLUME"
fi

# --- Gesamtgröße ---
TOTAL_SIZE=$(du -sh "$DAILY_DIR" | cut -f1)
log "Gesamtgröße: ${TOTAL_SIZE}"

# --- Alte Backups löschen (Rotation) ---
log "--- Rotation (${RETENTION_DAYS} Tage) ---"

DELETED=0
if [ -d "$BACKUP_DIR" ]; then
    while IFS= read -r old_dir; do
        if [ -n "$old_dir" ] && [ "$old_dir" != "$DAILY_DIR" ]; then
            rm -rf "$old_dir"
            log "  Gelöscht: $(basename "$old_dir")"
            DELETED=$((DELETED + 1))
        fi
    done < <(find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -mtime +${RETENTION_DAYS})
fi

log "Alte Backups gelöscht: ${DELETED}"

# --- Zusammenfassung ---
log "=========================================="
if [ "$FAILED" -eq 0 ]; then
    log "Backup ERFOLGREICH abgeschlossen"
    log "  DBs: ${SUCCESS}/${TOTAL} | Größe: ${TOTAL_SIZE}"
else
    log "Backup mit WARNUNGEN abgeschlossen"
    log "  DBs: ${SUCCESS}/${TOTAL} erfolgreich, ${FAILED} fehlgeschlagen"
fi
log "=========================================="

# Exit-Code: 0 = alle OK, 1 = mindestens ein Fehler
[ "$FAILED" -eq 0 ]
