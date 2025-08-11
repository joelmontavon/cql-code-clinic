#!/bin/bash
set -e

# CQL Code Clinic Backup Script
# Automated backup solution for database and application data

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/app/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
POSTGRES_DB="${POSTGRES_DB:-cql_clinic}"
POSTGRES_USER="${POSTGRES_USER:-cql_user}"
S3_BUCKET="${BACKUP_S3_BUCKET:-}"
S3_REGION="${BACKUP_S3_REGION:-us-east-1}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

# Create backup directory
create_backup_dir() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="$BACKUP_DIR/$timestamp"
    
    mkdir -p "$backup_path"
    echo "$backup_path"
}

# Backup PostgreSQL database
backup_database() {
    local backup_path="$1"
    log "Starting database backup..."
    
    local db_backup_file="$backup_path/database.sql"
    local db_backup_compressed="$backup_path/database.sql.gz"
    
    # Create database dump
    if pg_dump -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
        --no-owner --no-privileges --clean --if-exists > "$db_backup_file"; then
        
        # Compress the backup
        gzip "$db_backup_file"
        
        # Verify backup integrity
        if zcat "$db_backup_compressed" | head -n 20 | grep -q "PostgreSQL database dump"; then
            log "Database backup completed: $(basename $db_backup_compressed)"
            log "Backup size: $(du -h $db_backup_compressed | cut -f1)"
        else
            error "Database backup verification failed"
            return 1
        fi
    else
        error "Database backup failed"
        return 1
    fi
}

# Backup application data
backup_app_data() {
    local backup_path="$1"
    log "Starting application data backup..."
    
    # Backup uploads directory if it exists
    if [[ -d "/app/uploads" ]]; then
        log "Backing up uploads directory..."
        tar -czf "$backup_path/uploads.tar.gz" -C /app uploads
        log "Uploads backup completed: uploads.tar.gz"
    fi
    
    # Backup logs directory if it exists
    if [[ -d "/app/logs" ]]; then
        log "Backing up logs directory..."
        tar -czf "$backup_path/logs.tar.gz" -C /app logs
        log "Logs backup completed: logs.tar.gz"
    fi
    
    # Backup configuration files
    log "Backing up configuration files..."
    mkdir -p "$backup_path/config"
    
    # Copy environment files if they exist
    for env_file in .env .env.production .env.staging; do
        if [[ -f "/app/$env_file" ]]; then
            cp "/app/$env_file" "$backup_path/config/"
        fi
    done
    
    # Copy docker-compose files
    for compose_file in docker-compose.yml docker-compose.*.yml; do
        if [[ -f "/app/$compose_file" ]]; then
            cp "/app/$compose_file" "$backup_path/config/"
        fi
    done
    
    log "Configuration backup completed"
}

# Create backup manifest
create_manifest() {
    local backup_path="$1"
    local manifest_file="$backup_path/manifest.json"
    
    log "Creating backup manifest..."
    
    # Get backup information
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    local hostname=$(hostname)
    local backup_size=$(du -sb "$backup_path" | cut -f1)
    
    # Create manifest JSON
    cat > "$manifest_file" << EOF
{
    "backup_timestamp": "$timestamp",
    "backup_path": "$(basename $backup_path)",
    "hostname": "$hostname",
    "environment": "${NODE_ENV:-production}",
    "database": {
        "name": "$POSTGRES_DB",
        "user": "$POSTGRES_USER"
    },
    "files": [
$(find "$backup_path" -type f -not -name "manifest.json" -printf '        {"name": "%f", "size": %s, "path": "%P"},\n' | sed '$ s/,$//')
    ],
    "total_size_bytes": $backup_size,
    "total_size_human": "$(du -sh $backup_path | cut -f1)"
}
EOF
    
    log "Backup manifest created"
}

# Upload to S3 if configured
upload_to_s3() {
    local backup_path="$1"
    
    if [[ -n "$S3_BUCKET" ]]; then
        log "Uploading backup to S3..."
        
        # Check if AWS CLI is available
        if ! command -v aws &> /dev/null; then
            warn "AWS CLI not available, skipping S3 upload"
            return 1
        fi
        
        # Create tarball of entire backup
        local backup_name="$(basename $backup_path).tar.gz"
        local backup_tarball="/tmp/$backup_name"
        
        tar -czf "$backup_tarball" -C "$(dirname $backup_path)" "$(basename $backup_path)"
        
        # Upload to S3
        local s3_key="backups/$(date +%Y/%m/%d)/$backup_name"
        
        if aws s3 cp "$backup_tarball" "s3://$S3_BUCKET/$s3_key" --region "$S3_REGION"; then
            log "Backup uploaded to S3: s3://$S3_BUCKET/$s3_key"
            
            # Clean up local tarball
            rm -f "$backup_tarball"
            
            # Set lifecycle policy if not exists
            aws s3api put-bucket-lifecycle-configuration \
                --bucket "$S3_BUCKET" \
                --lifecycle-configuration file:///app/scripts/s3-lifecycle.json \
                --region "$S3_REGION" 2>/dev/null || true
        else
            error "Failed to upload backup to S3"
            rm -f "$backup_tarball"
            return 1
        fi
    else
        log "S3 backup not configured, keeping local backup only"
    fi
}

# Clean up old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    if [[ -d "$BACKUP_DIR" ]]; then
        # Remove backups older than retention period
        find "$BACKUP_DIR" -type d -name "*_*" -mtime +$RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null || true
        
        # Count remaining backups
        local remaining_backups=$(find "$BACKUP_DIR" -type d -name "*_*" | wc -l)
        log "Cleanup completed. $remaining_backups backup(s) remaining"
        
        # Clean up S3 old backups if configured
        if [[ -n "$S3_BUCKET" ]]; then
            log "S3 lifecycle policy will handle old backup cleanup"
        fi
    fi
}

# Verify backup integrity
verify_backup() {
    local backup_path="$1"
    log "Verifying backup integrity..."
    
    local errors=0
    
    # Check database backup
    if [[ -f "$backup_path/database.sql.gz" ]]; then
        if zcat "$backup_path/database.sql.gz" | head -n 1 | grep -q "PostgreSQL database dump"; then
            log "Database backup verification: OK"
        else
            error "Database backup verification: FAILED"
            ((errors++))
        fi
    else
        warn "Database backup not found"
    fi
    
    # Check uploads backup
    if [[ -f "$backup_path/uploads.tar.gz" ]]; then
        if tar -tzf "$backup_path/uploads.tar.gz" >/dev/null 2>&1; then
            log "Uploads backup verification: OK"
        else
            error "Uploads backup verification: FAILED"
            ((errors++))
        fi
    fi
    
    # Check manifest
    if [[ -f "$backup_path/manifest.json" ]]; then
        if python3 -m json.tool "$backup_path/manifest.json" >/dev/null 2>&1; then
            log "Manifest verification: OK"
        else
            error "Manifest verification: FAILED"
            ((errors++))
        fi
    else
        error "Manifest not found"
        ((errors++))
    fi
    
    if [[ $errors -eq 0 ]]; then
        log "Backup verification completed successfully"
        return 0
    else
        error "Backup verification failed with $errors error(s)"
        return 1
    fi
}

# Send notification
send_notification() {
    local backup_path="$1"
    local status="$2"
    local message="$3"
    
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        local backup_name=$(basename "$backup_path")
        local backup_size=$(du -sh "$backup_path" | cut -f1)
        
        local payload="{
            \"text\": \"Backup $status: $backup_name\",
            \"attachments\": [{
                \"color\": \"$([ "$status" = "completed" ] && echo "good" || echo "danger")\",
                \"fields\": [
                    {\"title\": \"Environment\", \"value\": \"${NODE_ENV:-production}\", \"short\": true},
                    {\"title\": \"Backup Size\", \"value\": \"$backup_size\", \"short\": true},
                    {\"title\": \"Timestamp\", \"value\": \"$(date)\", \"short\": true}
                ],
                \"text\": \"$message\"
            }]
        }"
        
        curl -X POST -H 'Content-type: application/json' \
            --data "$payload" \
            "$SLACK_WEBHOOK_URL" >/dev/null 2>&1 || warn "Failed to send Slack notification"
    fi
}

# Main backup function
main() {
    log "=== CQL Code Clinic Backup Started ==="
    
    # Check if database is available
    if ! pg_isready -h postgres -U "$POSTGRES_USER" >/dev/null 2>&1; then
        error "Database is not available"
        send_notification "" "failed" "Database connection failed"
        exit 1
    fi
    
    # Create backup directory
    local backup_path=$(create_backup_dir)
    log "Created backup directory: $(basename $backup_path)"
    
    # Perform backups
    if backup_database "$backup_path" && \
       backup_app_data "$backup_path" && \
       create_manifest "$backup_path" && \
       verify_backup "$backup_path"; then
        
        log "Backup completed successfully"
        
        # Upload to S3 if configured
        upload_to_s3 "$backup_path" || warn "S3 upload failed, backup remains local"
        
        # Cleanup old backups
        cleanup_old_backups
        
        # Send success notification
        send_notification "$backup_path" "completed" "All backup operations completed successfully"
        
        log "=== Backup Process Completed ==="
        
    else
        error "Backup process failed"
        send_notification "$backup_path" "failed" "Backup process encountered errors"
        exit 1
    fi
}

# Run main function
main "$@"