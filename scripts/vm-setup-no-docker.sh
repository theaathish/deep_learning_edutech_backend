#!/bin/bash
# ==============================================
# EduTech VM Setup Script (No Docker)
# Optimized for 2GB RAM / 1 CPU VM
# Uses: Node.js + PM2 + PostgreSQL + Cloudflare Tunnel
# ==============================================

set -e

echo "=========================================="
echo "EduTech VM Setup (No Docker)"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root (sudo)${NC}"
  exit 1
fi

# System update
echo -e "${GREEN}[1/10] Updating system packages...${NC}"
apt-get update && apt-get upgrade -y

# Install essential packages
echo -e "${GREEN}[2/10] Installing essential packages...${NC}"
apt-get install -y \
  curl \
  wget \
  git \
  build-essential \
  ufw \
  htop \
  nano \
  unzip \
  logrotate

# Install Node.js 20 LTS
echo -e "${GREEN}[3/10] Installing Node.js 20 LTS...${NC}"
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

# Install PM2 globally
echo -e "${GREEN}[4/10] Installing PM2...${NC}"
npm install -g pm2

# Configure PM2 to start on boot
pm2 startup systemd -u root --hp /root
pm2 save

# Setup PostgreSQL (if not already installed)
echo -e "${GREEN}[5/10] Configuring PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
  apt-get install -y postgresql postgresql-contrib
fi

# Start and enable PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Configure PostgreSQL for production
cat > /etc/postgresql/*/main/conf.d/edutech.conf << 'EOF'
# EduTech PostgreSQL Configuration
# Optimized for 2GB RAM VM

# Memory Settings
shared_buffers = 256MB
effective_cache_size = 512MB
maintenance_work_mem = 64MB
work_mem = 4MB
wal_buffers = 8MB

# Checkpoint Settings
checkpoint_completion_target = 0.9
min_wal_size = 1GB
max_wal_size = 2GB

# Connection Settings
max_connections = 50
listen_addresses = 'localhost'

# Performance
random_page_cost = 1.1
effective_io_concurrency = 200
default_statistics_target = 100

# Logging
log_min_duration_statement = 1000
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d '
EOF

# Restart PostgreSQL to apply config
systemctl restart postgresql

# Create database and user
echo -e "${GREEN}[6/10] Creating database...${NC}"
sudo -u postgres psql << EOF
-- Create user if not exists
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'edutech') THEN
    CREATE USER edutech WITH PASSWORD '${DB_PASSWORD:-edutech_secure_password_change_me}';
  END IF;
END
\$\$;

-- Create database if not exists
SELECT 'CREATE DATABASE edutech OWNER edutech'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'edutech')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE edutech TO edutech;
EOF

# Create application directories
echo -e "${GREEN}[7/10] Creating application directories...${NC}"
mkdir -p /opt/edutech-backend
mkdir -p /mnt/data/uploads/{videos,images,thumbnails,documents}
mkdir -p /mnt/data/backups
mkdir -p /var/log/edutech

# Set permissions
chown -R root:root /opt/edutech-backend
chown -R root:root /mnt/data/uploads
chmod -R 755 /mnt/data/uploads

# Setup firewall
echo -e "${GREEN}[8/10] Configuring firewall...${NC}"
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
# No need to open 80/443 - Cloudflare Tunnel handles everything
ufw --force enable

# Configure swap (useful for 2GB RAM)
echo -e "${GREEN}[9/10] Configuring swap...${NC}"
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  # Optimize swap usage
  echo 'vm.swappiness=10' >> /etc/sysctl.conf
  echo 'vm.vfs_cache_pressure=50' >> /etc/sysctl.conf
  sysctl -p
fi

# Setup log rotation
echo -e "${GREEN}[10/10] Configuring log rotation...${NC}"
cat > /etc/logrotate.d/edutech << 'EOF'
/var/log/edutech/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 root root
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Create backup script
cat > /opt/backup-db.sh << 'EOF'
#!/bin/bash
# Daily PostgreSQL backup script

BACKUP_DIR="/mnt/data/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/edutech_${DATE}.sql.gz"

# Create backup
sudo -u postgres pg_dump edutech | gzip > "${BACKUP_FILE}"

# Keep only last 7 days
find ${BACKUP_DIR} -name "edutech_*.sql.gz" -mtime +7 -delete

echo "Backup completed: ${BACKUP_FILE}"
EOF
chmod +x /opt/backup-db.sh

# Setup daily backup cron
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/backup-db.sh >> /var/log/edutech/backup.log 2>&1") | crontab -

# Create environment file template
cat > /opt/edutech-backend/.env.production << 'EOF'
# EduTech Production Environment
# Fill in your actual values

NODE_ENV=production
PORT=5000

# Database (local PostgreSQL)
DATABASE_URL=postgresql://edutech:YOUR_DB_PASSWORD@localhost:5432/edutech?schema=public

# JWT Secrets (generate with: openssl rand -base64 64)
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here

# CORS (your Vercel frontend URL)
CORS_ORIGIN=https://your-app.vercel.app

# API URL (Cloudflare Tunnel domain)
API_URL=https://api.deeplearningedutech.com

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Razorpay
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_SECRET=xxx

# Email (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@email.com
EMAIL_PASSWORD=your_app_password

# Upload paths
UPLOAD_PATH=/mnt/data/uploads
EOF

echo ""
echo -e "${GREEN}=========================================="
echo "VM Setup Complete!"
echo "==========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Edit /opt/edutech-backend/.env.production with your actual values"
echo "2. Clone your repo: cd /opt/edutech-backend && git clone <repo> ."
echo "3. Install dependencies: npm install"
echo "4. Build: npm run build"
echo "5. Run migrations: npx prisma migrate deploy"
echo "6. Start with PM2: pm2 start ecosystem.config.js --env production"
echo ""
echo -e "${YELLOW}Cloudflare Tunnel:${NC}"
echo "Your tunnel should point to: http://localhost:5000"
echo ""
echo -e "${YELLOW}Database info:${NC}"
echo "Host: localhost"
echo "Port: 5432"
echo "Database: edutech"
echo "User: edutech"
echo ""
