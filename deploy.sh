set -e

echo "========================================="
echo "  EduShare Production Deployment"
echo "========================================="

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_NAME="edushare"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$PROJECT_DIR/venv"
USER=$(whoami)
GROUP=$(groups | awk '{print $1}')

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

echo ""
echo "1. Updating system packages..."
apt-get update
apt-get upgrade -y
print_status "System updated"

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

echo ""
echo "3. Setting up PostgreSQL..."
# Get DB password from .env if available, otherwise use a safe default OR prompt
DB_PWD=$(grep DATABASE_PASSWORD "$PROJECT_DIR/.env" | cut -d '=' -f2 || echo "edushare_db_2026")
DB_NAME=$(grep DATABASE_NAME "$PROJECT_DIR/.env" | cut -d '=' -f2 || echo "edushare_db")
DB_USER=$(grep DATABASE_USER "$PROJECT_DIR/.env" | cut -d '=' -f2 || echo "postgres")

sudo -u postgres psql << EOF
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME') THEN
        CREATE DATABASE $DB_NAME;
    END IF;
END
\$\$;
ALTER USER $DB_USER WITH PASSWORD '$DB_PWD';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF
print_status "PostgreSQL configured"

echo ""
echo "4. Creating directories..."
mkdir -p /var/log/edushare
mkdir -p /var/run/edushare
mkdir -p $PROJECT_DIR/logs
mkdir -p $PROJECT_DIR/staticfiles
mkdir -p $PROJECT_DIR/media
print_status "Directories created"

echo ""
echo "5. Setting up virtual environment..."
cd $PROJECT_DIR
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn psycopg2-binary django-redis
print_status "Virtual environment ready"

echo ""
echo "6. Building frontend..."
cd $PROJECT_DIR/frontend
if ! command -v npm &> /dev/null; then
    apt-get install -y nodejs npm
fi
npm install --legacy-peer-deps
npm run build
print_status "Frontend built"

echo ""
echo "7. Django setup..."
cd $PROJECT_DIR
python manage.py collectstatic --noinput --settings=edushare_project.settings_production
python manage.py migrate --settings=edushare_project.settings_production
print_status "Django configured"

echo ""
echo "8. Setting permissions..."
chown -R $USER:$GROUP $PROJECT_DIR
chmod -R 755 $PROJECT_DIR
chown -R $USER:$GROUP /var/log/edushare
chown -R $USER:$GROUP /var/run/edushare
print_status "Permissions set"

echo ""
echo "9. Setting up systemd service..."
cp $PROJECT_DIR/edushare.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable edushare
systemctl start edushare
print_status "Systemd service configured"

echo ""
echo "10. Setting up Nginx..."
cp $PROJECT_DIR/nginx_config.conf /etc/nginx/sites-available/edushare
ln -sf /etc/nginx/sites-available/edushare /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
systemctl enable nginx
print_status "Nginx configured"

echo ""
echo "11. Setting up SSL certificate..."
print_warning "Make sure your domain points to this server!"
DOMAIN="edushare.uz"
EMAIL="admin@edushare.uz"

certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m $EMAIL
print_status "SSL certificate installed"

echo ""
echo "12. Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
print_status "Firewall configured"

echo ""
echo "13. Setting up automatic SSL renewal..."
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
print_status "SSL auto-renewal configured"

echo ""
echo "14. Configuring Redis..."
systemctl enable redis-server
systemctl start redis-server
print_status "Redis configured"

# echo ""
# echo "15. Creating Django superuser..."
# print_warning "Enter superuser credentials:"
# cd $PROJECT_DIR
# source venv/bin/activate
# python manage.py createsuperuser --settings=edushare_project.settings_production

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