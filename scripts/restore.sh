#!/bin/bash
# Restore database from backup

set -e

if [ -z "$1" ]; then
    echo "Usage: ./restore.sh <backup_file>"
    echo "Example: ./restore.sh /mnt/data/backups/edutech_backup_2024-01-01_02-00-00.sql.gz"
    echo ""
    echo "Available backups:"
    ls -lh /mnt/data/backups/*.sql.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║         EduTech Database Restore                          ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "WARNING: This will replace all current data!"
echo "Backup file: $BACKUP_FILE"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

# Stop backend to prevent new connections
echo "Stopping backend..."
docker-compose stop backend

# Restore database
echo "Restoring database..."
gunzip -c "$BACKUP_FILE" | docker exec -i edutech_postgres psql -U edutech -d edutech

# Restart backend
echo "Starting backend..."
docker-compose start backend

echo ""
echo "Database restored successfully!"
echo "Please verify the data is correct."
