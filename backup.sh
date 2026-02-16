#!/bin/bash

# EduShare Backup Script
# Cron: 0 2 * * * /home/user/edushare/backup.sh

set -e

# Configuration
PROJECT_DIR="/home/user/edushare"
BACKUP_DIR="/home/user/backups/edushare"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Database credentials (from .env)
DB_NAME="edushare_db"
DB_USER="edushare_user"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================="
echo "  EduShare Backup - $DATE"
echo "========================================="

# Create backup directory
mkdir -p "$BACKUP_DIR/database"
mkdir -p "$BACKUP_DIR/media"
mkdir -p "$BACKUP_DIR/logs"

# 1. Database Backup
echo -e "${YELLOW}Backing up database...${NC}"
sudo -u postgres pg_dump $DB_NAME | gzip > "$BACKUP_DIR/database/db_$DATE.sql.gz"
echo -e "${GREEN}✓ Database backup complete${NC}"

# 2. Media Files Backup
echo -e "${YELLOW}Backing up media files...${NC}"
tar -czf "$BACKUP_DIR/media/media_$DATE.tar.gz" -C "$PROJECT_DIR" media/
echo -e "${GREEN}✓ Media files backup complete${NC}"

# 3. Logs Backup
echo -e "${YELLOW}Backing up logs...${NC}"
tar -czf "$BACKUP_DIR/logs/logs_$DATE.tar.gz" -C "$PROJECT_DIR" logs/
echo -e "${GREEN}✓ Logs backup complete${NC}"

# 4. Remove old backups
echo -e "${YELLOW}Removing backups older than $RETENTION_DAYS days...${NC}"
find "$BACKUP_DIR/database" -name "*.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR/media" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR/logs" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
echo -e "${GREEN}✓ Old backups removed${NC}"

# 5. Backup summary
BACKUP_SIZE=$(du -sh $BACKUP_DIR | cut -f1)
echo ""
echo "========================================="
echo -e "${GREEN}Backup Complete!${NC}"
echo "========================================="
echo "Date: $DATE"
echo "Location: $BACKUP_DIR"
echo "Total Size: $BACKUP_SIZE"
echo "Retention: $RETENTION_DAYS days"
echo ""

# Optional: Upload to remote storage (uncomment if needed)
# rsync -avz $BACKUP_DIR user@backup-server:/backups/
# rclone copy $BACKUP_DIR remote:edushare-backups/
