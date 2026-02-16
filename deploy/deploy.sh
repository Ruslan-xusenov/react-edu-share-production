#!/bin/bash

# EduShare Production Deployment Script
# Usage: ./deploy.sh

set -e

echo "🚀 Starting EduShare deployment..."

# 1. Update system and install dependencies
echo "📦 Installing system dependencies..."
sudo apt-get update
sudo apt-get install -y python3-pip python3-venv nginx postgresql postgresql-contrib libpq-dev curl

# 2. Create project directory
echo "📂 Setting up project directory..."
sudo mkdir -p /var/www/edushare
sudo chown -R $USER:$USER /var/www/edushare

# 3. Synchronize files (Assumes you are running this from the project root on the server)
# If you are deploying for the first time, you might want to git clone here instead.
# cp -r . /var/www/edushare/

# 4. Setup Virtual Environment
echo "🐍 Setting up Python Virtual Environment..."
cd /var/www/edushare

# Build Frontend (if npm is installed)
if command -v npm &> /dev/null
then
    echo "⚛️ Building Frontend..."
    cd frontend
    npm install
    npm run build
    cd ..
fi

python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn

# 5. Database Migrations and Static Files
echo "⚙️ Running Django management commands..."
python manage.py migrate
python manage.py collectstatic --noinput

# 6. Setup Logging
echo "📝 Setting up logs..."
sudo mkdir -p /var/log/gunicorn
sudo chown -R www-data:www-data /var/log/gunicorn

# 7. Configure Nginx
echo "🌐 Configuring Nginx..."
sudo cp deploy/nginx/edushare.uz.conf /etc/nginx/sites-available/edushare
sudo ln -sf /etc/nginx/sites-available/edushare /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 8. Configure Systemd
echo "🔄 Configuring Systemd service..."
sudo cp deploy/systemd/edushare.service /etc/systemd/system/edushare.service
sudo systemctl daemon-reload
sudo systemctl enable edushare
sudo systemctl restart edushare

# 9. SSL with Certbot
echo "🔒 Would you like to install SSL certificates? (y/n)"
read -r install_ssl
if [ "$install_ssl" = "y" ]; then
    sudo apt-get install -y certbot python3-certbot-nginx
    sudo certbot --nginx -d edushare.uz -d www.edushare.uz
fi

echo "✅ Deployment complete! Visit https://edushare.uz"
