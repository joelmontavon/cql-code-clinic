# CQL Code Clinic Deployment Guide

This guide provides comprehensive instructions for deploying the CQL Code Clinic platform in various environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Local Development](#local-development)
- [Staging Deployment](#staging-deployment)
- [Production Deployment](#production-deployment)
- [Monitoring and Observability](#monitoring-and-observability)
- [Backup and Recovery](#backup-and-recovery)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)

## Prerequisites

### System Requirements

- **OS**: Linux (Ubuntu 20.04+ or CentOS 8+), macOS, or Windows with WSL2
- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **RAM**: Minimum 8GB (16GB recommended for production)
- **CPU**: 4+ cores recommended
- **Storage**: 50GB+ available space
- **Network**: Stable internet connection

### Required Tools

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### Optional Tools

- **AWS CLI**: For S3 backup integration
- **kubectl**: For Kubernetes deployment
- **Terraform**: For infrastructure as code

## Environment Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/cql-code-clinic.git
cd cql-code-clinic
```

### 2. Environment Configuration

Create environment files for each environment:

```bash
# Development
cp .env.example .env.development

# Staging
cp .env.production.example .env.staging

# Production
cp .env.production.example .env.production
```

### 3. Configure Environment Variables

Edit the appropriate environment file with your specific values:

**Critical Security Settings:**
```bash
# Generate strong secrets
openssl rand -hex 32  # For JWT_SECRET
openssl rand -hex 32  # For SESSION_SECRET
openssl rand -hex 32  # For CSRF_SECRET
```

**Database Settings:**
```bash
DATABASE_URL=postgresql://username:password@postgres:5432/database_name
POSTGRES_PASSWORD=your_secure_database_password
```

**Redis Settings:**
```bash
REDIS_URL=redis://:your_redis_password@redis:6379
REDIS_PASSWORD=your_secure_redis_password
```

## Local Development

### Quick Start

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop development environment
docker-compose -f docker-compose.dev.yml down
```

### Development URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Database**: localhost:5432
- **Redis**: localhost:6379

### Hot Reload

The development environment supports hot reload for both frontend and backend:

- Frontend changes are automatically reflected
- Backend restarts on file changes
- Database changes require manual migration

## Staging Deployment

### 1. Prepare Staging Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose (if not already installed)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Create application directory
sudo mkdir -p /opt/cql-code-clinic
sudo chown $USER:$USER /opt/cql-code-clinic
cd /opt/cql-code-clinic
```

### 2. Deploy to Staging

```bash
# Clone repository
git clone https://github.com/your-org/cql-code-clinic.git .

# Configure environment
cp .env.production.example .env.staging
# Edit .env.staging with staging-specific values

# Deploy using script
./scripts/deploy.sh staging
```

### 3. Verify Staging Deployment

```bash
# Check services
docker-compose ps

# Test endpoints
curl -f http://your-staging-domain.com/health
curl -f http://your-staging-domain.com/api/health
```

## Production Deployment

### 1. Server Preparation

#### Minimum Server Requirements

- **CPU**: 4+ cores
- **RAM**: 16GB+
- **Storage**: 100GB+ SSD
- **Network**: 1Gbps+

#### Security Hardening

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Configure firewall
sudo ufw enable
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS

# Disable root login
sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# Setup fail2ban
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
```

### 2. SSL Certificate Setup

#### Using Let's Encrypt

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# Generate certificate
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Setup auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Using Custom Certificates

```bash
# Create SSL directory
sudo mkdir -p /opt/ssl

# Copy your certificates
sudo cp your-certificate.crt /opt/ssl/
sudo cp your-private-key.key /opt/ssl/
sudo chmod 600 /opt/ssl/*
```

### 3. Production Deployment

```bash
# Clone repository to production server
cd /opt
sudo git clone https://github.com/your-org/cql-code-clinic.git
sudo chown -R $USER:$USER cql-code-clinic
cd cql-code-clinic

# Configure production environment
cp .env.production.example .env.production
# IMPORTANT: Edit .env.production with secure production values

# Deploy with monitoring
./scripts/deploy.sh production

# Enable production profile (includes monitoring)
docker-compose --profile monitoring up -d
```

### 4. Post-Deployment Steps

```bash
# Verify all services
./scripts/health-check.sh

# Setup database backup
sudo crontab -e
# Add: 0 2 * * * /opt/cql-code-clinic/scripts/backup.sh

# Setup log rotation
sudo cp scripts/logrotate.conf /etc/logrotate.d/cql-clinic

# Configure monitoring alerts
# Edit monitoring/alertmanager.yml with your notification settings
```

## Monitoring and Observability

### Grafana Dashboard

- **URL**: http://your-domain.com:3003
- **Default Login**: admin/admin (change on first login)

### Key Metrics to Monitor

1. **Application Metrics**
   - Request rate and response time
   - Error rate
   - CQL execution time
   - User activity

2. **Infrastructure Metrics**
   - CPU and memory usage
   - Disk I/O and space
   - Network traffic
   - Container health

3. **Database Metrics**
   - Connection pool usage
   - Query performance
   - Database size growth
   - Slow queries

### Prometheus Alerts

Configure alerts in `monitoring/alerts.yml`:

```yaml
groups:
  - name: cql-clinic-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 2m
        annotations:
          summary: High error rate detected
```

### Log Management

Logs are automatically collected by Promtail and stored in Loki:

- **Application Logs**: Available in Grafana
- **System Logs**: Collected from `/var/log`
- **Container Logs**: Automatically collected from Docker

## Backup and Recovery

### Automated Backup

Backups run automatically via the `scripts/backup.sh` script:

- **Database**: Full PostgreSQL dump
- **Uploads**: Application files and user data
- **Configuration**: Environment and compose files
- **Retention**: 7 days by default

### Manual Backup

```bash
# Create immediate backup
./scripts/backup.sh

# Backup with S3 upload
S3_BUCKET=your-backup-bucket ./scripts/backup.sh
```

### Restore from Backup

```bash
# List available backups
ls -la backups/

# Restore from specific backup
./scripts/restore.sh backups/20231215_143000

# Restore from S3
aws s3 cp s3://your-backup-bucket/backups/backup.tar.gz .
tar -xzf backup.tar.gz
./scripts/restore.sh backup/
```

## Security Considerations

### Network Security

1. **Firewall Configuration**
   ```bash
   # Only allow necessary ports
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw allow 22/tcp
   ```

2. **Reverse Proxy**
   - Use Traefik or Nginx for SSL termination
   - Enable rate limiting
   - Configure security headers

### Application Security

1. **Environment Variables**
   - Never commit secrets to version control
   - Use strong, unique passwords
   - Rotate secrets regularly

2. **Database Security**
   - Use strong database passwords
   - Enable SSL connections
   - Regular security updates

3. **Container Security**
   - Run containers as non-root users
   - Use minimal base images
   - Regular image updates

### Monitoring Security Events

The application includes comprehensive security monitoring:

- **Threat Detection**: SQL injection, XSS, path traversal
- **Brute Force Protection**: Automatic IP blocking
- **Audit Logging**: All security events logged
- **Real-time Alerts**: Webhook notifications for critical events

## Troubleshooting

### Common Issues

#### Service Won't Start

```bash
# Check service logs
docker-compose logs service-name

# Check disk space
df -h

# Check memory usage
free -h

# Restart specific service
docker-compose restart service-name
```

#### Database Connection Issues

```bash
# Check database status
docker-compose exec postgres pg_isready

# Check database logs
docker-compose logs postgres

# Reset database connection
docker-compose restart backend
```

#### High CPU/Memory Usage

```bash
# Check resource usage
docker stats

# Check system resources
htop

# Scale services if needed
docker-compose up -d --scale backend=2
```

### Performance Issues

1. **Slow Response Times**
   - Check database slow query log
   - Review cache hit rates
   - Monitor resource usage

2. **High Memory Usage**
   - Check for memory leaks in logs
   - Review cache configuration
   - Scale horizontally if needed

### Health Checks

```bash
# Run comprehensive health check
./scripts/health-check.sh

# Check individual services
curl -f http://localhost:3000/health  # Frontend
curl -f http://localhost:3001/health  # Backend
```

## Maintenance

### Regular Maintenance Tasks

#### Daily
- Monitor system health
- Check error logs
- Verify backups completed

#### Weekly
- Update Docker images
- Clean up old logs
- Review security alerts

#### Monthly
- Update system packages
- Rotate secrets (if required)
- Review and update documentation
- Performance optimization review

### Updates and Upgrades

#### Application Updates

```bash
# Pull latest code
git pull origin main

# Update images
docker-compose pull

# Deploy updates
./scripts/deploy.sh production
```

#### System Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Restart services if needed
docker-compose restart
```

### Scaling

#### Horizontal Scaling

```bash
# Scale backend services
docker-compose up -d --scale backend=3

# Scale with load balancer
# Configure nginx upstream or Traefik load balancing
```

#### Vertical Scaling

Update resource limits in docker-compose.yml:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

## Support and Documentation

- **Application Logs**: Check Grafana dashboards
- **System Logs**: `/var/log/syslog`
- **Docker Logs**: `docker-compose logs`
- **Metrics**: Prometheus at :9090
- **Dashboards**: Grafana at :3003

For additional support, please refer to:
- [Application Documentation](README.md)
- [API Documentation](API.md)
- [Security Guide](SECURITY.md)
- [Contributing Guidelines](CONTRIBUTING.md)

---

**Important**: Always test deployments in a staging environment before deploying to production. Keep this deployment guide updated as the application evolves.