#!/bin/bash
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

# Load environment variables from .env.production
if [ -f "$PROJECT_DIR/.env.production" ]; then
    echo "Loading environment variables from .env.production..."
    while IFS='=' read -r key value || [ -n "$key" ]; do
        # skip comments and empty lines
        [[ $key =~ ^#.* ]] && continue
        [[ -z $key ]] && continue
        # trim whitespace and remove potential carriage returns
        key=$(echo "$key" | xargs | tr -d '\r')
        value=$(echo "$value" | xargs | tr -d '\r')
        # Only export if it's a valid variable name
        if [[ "$key" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
            export "$key"="$value"
        fi
    done < "$PROJECT_DIR/.env.production"
fi

# Set database variables with defaults if not provided by .env
DB_NAME=${DB_NAME:-"edushare_db"}
DB_USER=${DB_USER:-"edushare_user"}
DB_PWD=${DB_PASSWORD:-"edushare_pass"}

echo "Using Database Configuration:"
echo "  DB_NAME: $DB_NAME"
echo "  DB_USER: $DB_USER"

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

echo "Waiting for PostgreSQL to be ready..."
for i in {1..5}; do
    if sudo -u postgres psql -h 127.0.0.1 -c "SELECT 1" > /dev/null 2>&1; then
        break
    fi
    echo "Wait $i/5..."
    sleep 2
done

echo "Configuring PostgreSQL database and user..."
# Try to run psql. We try unix socket first (standard for sudo -u postgres), then TCP fallback.
if ! sudo -u postgres psql << EOF
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '$DB_USER') THEN
        CREATE USER $DB_USER WITH PASSWORD '$DB_PWD';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME') THEN
        CREATE DATABASE $DB_NAME;
    END IF;
END
\$\$;
ALTER USER $DB_USER WITH PASSWORD '$DB_PWD';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;
EOF
then
    echo "Unix socket failed, trying TCP fallback..."
    sudo -u postgres psql -h 127.0.0.1 << EOF
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '$DB_USER') THEN
        CREATE USER $DB_USER WITH PASSWORD '$DB_PWD';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME') THEN
        CREATE DATABASE $DB_NAME;
    END IF;
END
\$\$;
ALTER USER $DB_USER WITH PASSWORD '$DB_PWD';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;
EOF
fi

# Grant schema permissions (required for PostgreSQL 15+)
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER; GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER; GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;"

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
. venv/bin/activate
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
python3 manage.py collectstatic --noinput --settings=edushare_project.settings_production
python3 manage.py migrate --settings=edushare_project.settings_production
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
cp $PROJECT_DIR/edushare.service /etc/systemd/system/edushare.service
sed -i "s|{{PROJECT_DIR}}|$PROJECT_DIR|g" /etc/systemd/system/edushare.service
sed -i "s|{{VENV_DIR}}|$VENV_DIR|g" /etc/systemd/system/edushare.service
sed -i "s|{{USER}}|$USER|g" /etc/systemd/system/edushare.service
sed -i "s|{{GROUP}}|$GROUP|g" /etc/systemd/system/edushare.service

systemctl daemon-reload
systemctl enable edushare
systemctl restart edushare
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

# Only run certbot if the domain is correctly pointing and it's not a dry run test
if [ "$1" != "--no-ssl" ]; then
    certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m $EMAIL || print_warning "SSL certificate installation failed. Skipping..."
fi
print_status "SSL certificate step processed"

echo ""
echo "12. Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    print_status "Firewall configured"
fi

echo ""
echo "13. Setting up automatic SSL renewal..."
if command -v crontab &> /dev/null; then
    (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
    print_status "SSL auto-renewal configured"
fi

echo ""
echo "14. Configuring Redis..."
systemctl enable redis-server
systemctl start redis-server
print_status "Redis configured"

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