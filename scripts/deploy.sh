#!/bin/bash
set -e

# CQL Code Clinic Deployment Script
# Usage: ./scripts/deploy.sh [environment] [options]

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="production"
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env.production"
BACKUP_ENABLED=true
HEALTH_CHECK_ENABLED=true
ROLLBACK_ON_FAILURE=true
FORCE_REBUILD=false
SKIP_TESTS=false
MONITORING_UPDATE=true

# Function to print colored output
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Function to show usage
usage() {
    cat << EOF
Usage: $0 [ENVIRONMENT] [OPTIONS]

ENVIRONMENT:
    staging         Deploy to staging environment
    production      Deploy to production environment (default)
    development     Deploy to development environment

OPTIONS:
    --no-backup             Skip database backup
    --no-health-check       Skip health checks
    --no-rollback           Don't rollback on failure
    --force-rebuild         Force rebuild of all containers
    --skip-tests            Skip running tests before deployment
    --no-monitoring-update  Skip monitoring configuration update
    --compose-file FILE     Use specific docker-compose file
    --env-file FILE         Use specific environment file
    -h, --help              Show this help message

EXAMPLES:
    $0 production
    $0 staging --no-backup --force-rebuild
    $0 development --skip-tests --no-health-check

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        staging|production|development)
            ENVIRONMENT="$1"
            ;;
        --no-backup)
            BACKUP_ENABLED=false
            ;;
        --no-health-check)
            HEALTH_CHECK_ENABLED=false
            ;;
        --no-rollback)
            ROLLBACK_ON_FAILURE=false
            ;;
        --force-rebuild)
            FORCE_REBUILD=true
            ;;
        --skip-tests)
            SKIP_TESTS=true
            ;;
        --no-monitoring-update)
            MONITORING_UPDATE=false
            ;;
        --compose-file)
            COMPOSE_FILE="$2"
            shift
            ;;
        --env-file)
            ENV_FILE="$2"
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
    shift
done

# Set environment-specific configurations
case $ENVIRONMENT in
    staging)
        COMPOSE_FILE="docker-compose.staging.yml"
        ENV_FILE=".env.staging"
        BACKUP_ENABLED=false  # Usually no backup needed for staging
        ;;
    development)
        COMPOSE_FILE="docker-compose.dev.yml"
        ENV_FILE=".env.development"
        BACKUP_ENABLED=false
        HEALTH_CHECK_ENABLED=false
        SKIP_TESTS=true
        ;;
esac

log "Starting deployment to $ENVIRONMENT environment"
log "Using compose file: $COMPOSE_FILE"
log "Using environment file: $ENV_FILE"

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        error "Docker is not running"
        exit 1
    fi
    
    # Check if docker-compose is available
    if ! command -v docker-compose > /dev/null 2>&1; then
        error "docker-compose is not installed"
        exit 1
    fi
    
    # Check if compose file exists
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        error "Compose file $COMPOSE_FILE not found"
        exit 1
    fi
    
    # Check if environment file exists
    if [[ ! -f "$ENV_FILE" ]]; then
        error "Environment file $ENV_FILE not found"
        exit 1
    fi
    
    log "Prerequisites check passed"
}

# Run tests before deployment
run_tests() {
    if [[ "$SKIP_TESTS" == false ]]; then
        log "Running tests..."
        
        # Frontend tests
        if [[ -f "frontend/package.json" ]]; then
            log "Running frontend tests..."
            cd frontend
            if npm test -- --run --reporter=verbose; then
                log "Frontend tests passed"
            else
                error "Frontend tests failed"
                cd ..
                exit 1
            fi
            cd ..
        fi
        
        # Backend tests
        if [[ -f "backend/package.json" ]]; then
            log "Running backend tests..."
            cd backend
            if npm test; then
                log "Backend tests passed"
            else
                error "Backend tests failed"
                cd ..
                exit 1
            fi
            cd ..
        fi
        
        log "All tests passed"
    else
        warn "Skipping tests (--skip-tests flag used)"
    fi
}

# Create backup before deployment
create_backup() {
    if [[ "$BACKUP_ENABLED" == true ]]; then
        log "Creating backup before deployment..."
        
        # Create backup directory
        BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        
        # Backup database
        if docker-compose -f "$COMPOSE_FILE" ps postgres | grep -q "Up"; then
            log "Backing up database..."
            docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_dump \
                -U "${POSTGRES_USER:-cql_user}" \
                -d "${POSTGRES_DB:-cql_clinic}" \
                --no-owner --no-privileges > "$BACKUP_DIR/database.sql"
            
            if [[ $? -eq 0 ]]; then
                log "Database backup created: $BACKUP_DIR/database.sql"
            else
                error "Database backup failed"
                exit 1
            fi
        fi
        
        # Backup uploads and other persistent data
        if [[ -d "data/uploads" ]]; then
            log "Backing up uploads..."
            cp -r data/uploads "$BACKUP_DIR/"
            log "Uploads backup created"
        fi
        
        # Backup current docker-compose configuration
        cp "$COMPOSE_FILE" "$BACKUP_DIR/"
        cp "$ENV_FILE" "$BACKUP_DIR/"
        
        log "Backup completed: $BACKUP_DIR"
        echo "$BACKUP_DIR" > .last_backup
    else
        warn "Skipping backup (--no-backup flag used)"
    fi
}

# Stop current services
stop_services() {
    log "Stopping current services..."
    docker-compose -f "$COMPOSE_FILE" down --remove-orphans
    log "Services stopped"
}

# Pull latest images
pull_images() {
    log "Pulling latest Docker images..."
    if docker-compose -f "$COMPOSE_FILE" pull; then
        log "Images pulled successfully"
    else
        error "Failed to pull images"
        exit 1
    fi
}

# Build services if needed
build_services() {
    if [[ "$FORCE_REBUILD" == true ]]; then
        log "Force rebuilding services..."
        if docker-compose -f "$COMPOSE_FILE" build --no-cache; then
            log "Services built successfully"
        else
            error "Failed to build services"
            exit 1
        fi
    else
        log "Building services..."
        if docker-compose -f "$COMPOSE_FILE" build; then
            log "Services built successfully"
        else
            error "Failed to build services"
            exit 1
        fi
    fi
}

# Start services
start_services() {
    log "Starting services..."
    
    # Copy environment file to the expected location
    cp "$ENV_FILE" .env
    
    # Start services
    if docker-compose -f "$COMPOSE_FILE" up -d; then
        log "Services started successfully"
    else
        error "Failed to start services"
        
        if [[ "$ROLLBACK_ON_FAILURE" == true ]]; then
            rollback_deployment
        fi
        
        exit 1
    fi
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Wait for database to be ready
    sleep 10
    
    # Check if backend service is running
    if docker-compose -f "$COMPOSE_FILE" ps backend | grep -q "Up"; then
        # Run migrations
        if docker-compose -f "$COMPOSE_FILE" exec -T backend npm run db:migrate; then
            log "Database migrations completed"
        else
            warn "Database migrations failed or not available"
        fi
    else
        warn "Backend service not running, skipping migrations"
    fi
}

# Health check
health_check() {
    if [[ "$HEALTH_CHECK_ENABLED" == false ]]; then
        warn "Skipping health checks (--no-health-check flag used)"
        return 0
    fi
    
    log "Running health checks..."
    
    local max_attempts=30
    local attempt=1
    
    # Check frontend health
    log "Checking frontend health..."
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
            log "Frontend health check passed"
            break
        else
            if [[ $attempt -eq $max_attempts ]]; then
                error "Frontend health check failed after $max_attempts attempts"
                if [[ "$ROLLBACK_ON_FAILURE" == true ]]; then
                    rollback_deployment
                fi
                exit 1
            fi
            info "Frontend health check attempt $attempt failed, retrying in 5 seconds..."
            sleep 5
            ((attempt++))
        fi
    done
    
    # Check backend health
    attempt=1
    log "Checking backend health..."
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s http://localhost:3001/health > /dev/null 2>&1; then
            log "Backend health check passed"
            break
        else
            if [[ $attempt -eq $max_attempts ]]; then
                error "Backend health check failed after $max_attempts attempts"
                if [[ "$ROLLBACK_ON_FAILURE" == true ]]; then
                    rollback_deployment
                fi
                exit 1
            fi
            info "Backend health check attempt $attempt failed, retrying in 5 seconds..."
            sleep 5
            ((attempt++))
        fi
    done
    
    # Check database connectivity
    attempt=1
    log "Checking database connectivity..."
    while [[ $attempt -le $max_attempts ]]; do
        if docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U "${POSTGRES_USER:-cql_user}" > /dev/null 2>&1; then
            log "Database connectivity check passed"
            break
        else
            if [[ $attempt -eq $max_attempts ]]; then
                error "Database connectivity check failed after $max_attempts attempts"
                if [[ "$ROLLBACK_ON_FAILURE" == true ]]; then
                    rollback_deployment
                fi
                exit 1
            fi
            info "Database connectivity check attempt $attempt failed, retrying in 5 seconds..."
            sleep 5
            ((attempt++))
        fi
    done
    
    log "All health checks passed"
}

# Update monitoring configuration
update_monitoring() {
    if [[ "$MONITORING_UPDATE" == true && "$ENVIRONMENT" == "production" ]]; then
        log "Updating monitoring configuration..."
        
        # Restart monitoring services if they exist
        if docker-compose -f "$COMPOSE_FILE" ps prometheus | grep -q "Up"; then
            docker-compose -f "$COMPOSE_FILE" restart prometheus
            log "Prometheus restarted"
        fi
        
        if docker-compose -f "$COMPOSE_FILE" ps grafana | grep -q "Up"; then
            docker-compose -f "$COMPOSE_FILE" restart grafana
            log "Grafana restarted"
        fi
        
        log "Monitoring configuration updated"
    else
        warn "Skipping monitoring update"
    fi
}

# Rollback deployment
rollback_deployment() {
    error "Rolling back deployment..."
    
    # Stop current services
    docker-compose -f "$COMPOSE_FILE" down --remove-orphans
    
    # Check if backup exists
    if [[ -f ".last_backup" ]]; then
        BACKUP_DIR=$(cat .last_backup)
        
        if [[ -d "$BACKUP_DIR" ]]; then
            log "Restoring from backup: $BACKUP_DIR"
            
            # Restore database
            if [[ -f "$BACKUP_DIR/database.sql" ]]; then
                log "Restoring database..."
                docker-compose -f "$COMPOSE_FILE" up -d postgres
                sleep 10
                docker-compose -f "$COMPOSE_FILE" exec -T postgres psql \
                    -U "${POSTGRES_USER:-cql_user}" \
                    -d "${POSTGRES_DB:-cql_clinic}" \
                    < "$BACKUP_DIR/database.sql"
                log "Database restored"
            fi
            
            # Restore uploads
            if [[ -d "$BACKUP_DIR/uploads" ]]; then
                log "Restoring uploads..."
                rm -rf data/uploads
                cp -r "$BACKUP_DIR/uploads" data/
                log "Uploads restored"
            fi
            
            # Start services with old configuration
            docker-compose -f "$COMPOSE_FILE" up -d
            
            log "Rollback completed"
        else
            error "Backup directory not found: $BACKUP_DIR"
        fi
    else
        error "No backup information found"
    fi
}

# Cleanup old images and containers
cleanup() {
    log "Cleaning up old images and containers..."
    
    # Remove unused containers
    docker container prune -f
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused volumes (be careful with this in production)
    if [[ "$ENVIRONMENT" != "production" ]]; then
        docker volume prune -f
    fi
    
    log "Cleanup completed"
}

# Show deployment status
show_status() {
    log "Deployment Status:"
    echo ""
    docker-compose -f "$COMPOSE_FILE" ps
    echo ""
    
    # Show resource usage
    log "Resource Usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
    echo ""
    
    log "Deployment completed successfully!"
    log "Environment: $ENVIRONMENT"
    log "Frontend: http://localhost:3000"
    log "Backend: http://localhost:3001"
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log "Grafana Dashboard: http://localhost:3003 (admin/admin)"
        log "Prometheus: http://localhost:9090"
    fi
}

# Main deployment flow
main() {
    log "=== CQL Code Clinic Deployment ==="
    
    # Run all deployment steps
    check_prerequisites
    run_tests
    create_backup
    stop_services
    pull_images
    build_services
    start_services
    run_migrations
    health_check
    update_monitoring
    cleanup
    show_status
    
    log "=== Deployment Completed Successfully ==="
}

# Handle script interruption
cleanup_on_exit() {
    error "Deployment interrupted"
    
    if [[ "$ROLLBACK_ON_FAILURE" == true ]]; then
        rollback_deployment
    fi
    
    exit 1
}

# Set trap for cleanup on exit
trap cleanup_on_exit INT TERM

# Run main function
main "$@"