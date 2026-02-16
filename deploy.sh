#!/bin/bash

# EduShare Production Deployment Script
# Bu scriptni root yoki sudo bilan ishga tushiring

set -e  # Exit on error

echo "========================================="
echo "  EduShare Production Deployment"
echo "========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="edushare"
PROJECT_DIR="/home/user/edushare"
VENV_DIR="$PROJECT_DIR/venv"
USER="www-data"
GROUP="www-data"

# Functions
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# 1. System Update
echo ""
echo "1. Updating system packages..."
apt-get update
apt-get upgrade -y
print_status "System updated"

# 2. Install required packages
echo ""
echo "2. Installing required packages..."
apt-get install -y \
    python3-pip \
    python3-venv \
    python3-dev \
    postgresql \
    postgresql-contrib \
    nginx \
    redis-server \
    git \
    supervisor \
    certbot \
    python3-certbot-nginx
print_status "Packages installed"

# 3. Setup PostgreSQL
echo ""
echo "3. Setting up PostgreSQL..."
sudo -u postgres psql << EOF
CREATE DATABASE edushare_db;
CREATE USER edushare_user WITH PASSWORD 'CHANGE_THIS_PASSWORD';
ALTER ROLE edushare_user SET client_encoding TO 'utf8';
ALTER ROLE edushare_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE edushare_user SET timezone TO 'Asia/Tashkent';
GRANT ALL PRIVILEGES ON DATABASE edushare_db TO edushare_user;
\q
EOF
print_status "PostgreSQL configured"

# 4. Setup directories
echo ""
echo "4. Creating directories..."
mkdir -p /var/log/edushare
mkdir -p /var/run/edushare
mkdir -p $PROJECT_DIR/logs
mkdir -p $PROJECT_DIR/staticfiles
mkdir -p $PROJECT_DIR/media
print_status "Directories created"

# 5. Setup virtual environment
echo ""
echo "5. Setting up virtual environment..."
cd $PROJECT_DIR
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn psycopg2-binary django-redis
print_status "Virtual environment ready"

# 6. Django setup
echo ""
echo "6. Django setup..."
python manage.py collectstatic --noinput
python manage.py migrate --settings=edushare_project.settings_production
print_status "Django configured"

# 7. Set permissions
echo ""
echo "7. Setting permissions..."
chown -R $USER:$GROUP $PROJECT_DIR
chmod -R 755 $PROJECT_DIR
chown -R $USER:$GROUP /var/log/edushare
chown -R $USER:$GROUP /var/run/edushare
print_status "Permissions set"

# 8. Setup Systemd service
echo ""
echo "8. Setting up systemd service..."
cp $PROJECT_DIR/edushare.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable edushare
systemctl start edushare
print_status "Systemd service configured"

# 9. Setup Nginx
echo ""
echo "9. Setting up Nginx..."
cp $PROJECT_DIR/nginx_config.conf /etc/nginx/sites-available/edushare
ln -sf /etc/nginx/sites-available/edushare /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
systemctl enable nginx
print_status "Nginx configured"

# 10. Setup SSL with Let's Encrypt
echo ""
echo "10. Setting up SSL certificate..."
print_warning "Make sure your domain points to this server!"
read -p "Enter your domain (e.g., yourdomain.com): " DOMAIN
read -p "Enter your email: " EMAIL

certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m $EMAIL
print_status "SSL certificate installed"

# 11. Setup firewall
echo ""
echo "11. Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
print_status "Firewall configured"

# 12. Setup automatic SSL renewal
echo ""
echo "12. Setting up automatic SSL renewal..."
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
print_status "SSL auto-renewal configured"

# 13. Setup Redis
echo ""
echo "13. Configuring Redis..."
systemctl enable redis-server
systemctl start redis-server
print_status "Redis configured"

# 14. Create superuser
echo ""
echo "14. Creating Django superuser..."
print_warning "Enter superuser credentials:"
cd $PROJECT_DIR
source venv/bin/activate
python manage.py createsuperuser --settings=edushare_project.settings_production

# Final status
echo ""
echo "========================================="
echo -e "${GREEN}  Deployment Complete!${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Update .env.production with your actual credentials"
echo "2. Update nginx_config.conf with your domain"
echo "3. Restart services:"
echo "   sudo systemctl restart edushare"
echo "   sudo systemctl restart nginx"
echo ""
echo "Your site should be live at: https://$DOMAIN"
echo ""
print_status "All done!"
