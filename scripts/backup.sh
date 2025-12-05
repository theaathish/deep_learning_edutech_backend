#!/bin/bash
# Automated backup script for PostgreSQL
# Runs daily and keeps 7 days of backups

set -e

BACKUP_DIR="/backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/edutech_backup_$DATE.sql.gz"
KEEP_DAYS=7

echo "[$(date)] Starting database backup..."

# Create backup with compression
pg_dump -h postgres -U "$PGUSER" "$PGDATABASE" | gzip > "$BACKUP_FILE"

# Verify backup was created
if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
    echo "[$(date)] Backup completed: $BACKUP_FILE ($SIZE)"
else
    echo "[$(date)] ERROR: Backup failed!"
    exit 1
fi

# Remove old backups (keep last 7 days)
echo "[$(date)] Cleaning up old backups..."
find "$BACKUP_DIR" -name "edutech_backup_*.sql.gz" -mtime +$KEEP_DAYS -delete

# List remaining backups
echo "[$(date)] Current backups:"
ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "No backups found"

echo "[$(date)] Backup job completed successfully"
