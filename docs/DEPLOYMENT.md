# 🚀 EduShare - Production Deployment Guide

## 📋 Talablar

### Server Specifications (Minimum)
- **OS**: Ubuntu 20.04+ / Debian 11+
- **RAM**: 2GB minimum, 4GB recommended
- **CPU**: 2 cores minimum
- **Disk**: 20GB minimum, SSD tavsiya etiladi
- **Domain**: SSL sertifikat uchun

### Required Software
- Python 3.10+
- PostgreSQL 13+
- Nginx
- Redis
- Supervisor/Systemd
- Git

## 🔧 Quick Deployment (Avtomatik)

### 1. Serverni tayyorlash

```bash
# SSH orqali serverga kirish
ssh user@your-server-ip

# Root yoki sudo access
sudo su
```

### 2. Loyihani clone qilish

```bash
cd /home/user
git clone https://github.com/yourusername/edushare.git
cd edushare
```

### 3. Deploy scriptni ishga tushirish

```bash
# Executable qilish
chmod +x deploy.sh

# Ishga tushirish (root sifatida)
sudo ./deploy.sh
```

Script quyidagilarni avtomatik bajaradi:
- ✅ System packages o'rnatish
- ✅ PostgreSQL setup
- ✅ Virtual environment yaratish
- ✅ Dependencies o'rnatish
- ✅ Static files collection
- ✅ Database migration
- ✅ Nginx configuration
- ✅ SSL certificate (Let's Encrypt)
- ✅ Systemd service
- ✅ Firewall setup

## 📝 Manual Deployment (Qadamma-qadam)

### 1. System Update

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Required Packages

```bash
sudo apt install -y python3-pip python3-venv python3-dev \
    postgresql postgresql-contrib nginx redis-server \
    git supervisor certbot python3-certbot-nginx
```

### 3. PostgreSQL Setup

```bash
# PostgreSQL ga kirish
sudo -u postgres psql

# Database yaratish
CREATE DATABASE edushare_db;
CREATE USER edushare_user WITH PASSWORD 'your_strong_password';
ALTER ROLE edushare_user SET client_encoding TO 'utf8';
ALTER ROLE edushare_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE edushare_user SET timezone TO 'Asia/Tashkent';
GRANT ALL PRIVILEGES ON DATABASE edushare_db TO edushare_user;
\q
```

### 4. Project Setup

```bash
# Project directory
cd /home/user/edushare

# Virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

### 5. Environment Variables

```bash
# .env.production faylini tahrirlash
nano .env.production
```

**Muhim sozlamalar:**
```env
SECRET_KEY=<50+ belgili random string>
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
DB_PASSWORD=<database paroli>
EMAIL_HOST_USER=<email>
EMAIL_HOST_PASSWORD=<email app password>
```

### 6. Static Files va Migrations

```bash
# Static files
python manage.py collectstatic --noinput --settings=edushare_project.settings_production

# Migrations
python manage.py migrate --settings=edushare_project.settings_production

# Create superuser
python manage.py createsuperuser --settings=edushare_project.settings_production
```

### 7. Gunicorn Test

```bash
# Test Gunicorn
gunicorn --bind 0.0.0.0:8000 \
    --config gunicorn_config.py \
    --env DJANGO_SETTINGS_MODULE=edushare_project.settings_production \
    edushare_project.wsgi:application
```

### 8. Systemd Service

```bash
# Service faylini nusxalash
sudo cp edushare.service /etc/systemd/system/

# Service faylini tahrirlash (path'larni to'g'rilash)
sudo nano /etc/systemd/system/edushare.service

# Enable va start
sudo systemctl daemon-reload
sudo systemctl enable edushare
sudo systemctl start edushare
sudo systemctl status edushare
```

### 9. Nginx Configuration

```bash
# Config faylini tahrirlash
nano nginx_config.conf
# Domain va path'larni to'g'rilash

# Nginx'ga nusxalash
sudo cp nginx_config.conf /etc/nginx/sites-available/edushare
sudo ln -s /etc/nginx/sites-available/edushare /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test va restart
sudo nginx -t
sudo systemctl restart nginx
```

### 10. SSL Certificate (Let's Encrypt)

```bash
# Certbot bilan SSL o'rnatish
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Automatic renewal
sudo crontab -e
# Quyidagi qatorni qo'shing:
0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'
```

### 11. Firewall

```bash
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw enable
sudo ufw status
```

## 🔍 Post-Deployment Checks

### 1. Service Status

```bash
# Gunicorn
sudo systemctl status edushare

# Nginx
sudo systemctl status nginx

# PostgreSQL
sudo systemctl status postgresql

# Redis
sudo systemctl status redis
```

### 2. Logs

```bash
# Gunicorn logs
sudo tail -f /var/log/edushare/gunicorn-error.log

# Nginx logs
sudo tail -f /var/log/nginx/edushare-error.log

# Django logs
tail -f logs/edushare-production.log

# Security logs
tail -f logs/security-production.log
```

### 3. Test Website

```bash
# HTTP (redirect'ni test qilish)
curl -I http://yourdomain.com

# HTTPS
curl -I https://yourdomain.com

# SSL test
curl -I https://yourdomain.com -k -v
```

## 🔐 Security Checklist

- [ ] `DEBUG=False` in production
- [ ] Strong `SECRET_KEY` (50+ characters)
- [ ] `ALLOWED_HOSTS` to'g'ri sozlangan
- [ ] SSL certificate o'rnatilgan
- [ ] Firewall faol
- [ ] PostgreSQL parollar kuchli
- [ ] `.env.production` git'da yo'q
- [ ] File permissions to'g'ri (755/644)
- [ ] Regular backups sozlangan
- [ ] Monitoring (Sentry) sozlangan

## 📊 Monitoring va Maintenance

### Backups

```bash
# Database backup
sudo -u postgres pg_dump edushare_db > backup_$(date +%Y%m%d).sql

# Media files backup
tar -czf media_backup_$(date +%Y%m%d).tar.gz media/

# Automatic backup (cron)
0 2 * * * /home/user/edushare/backup.sh
```

### Updates

```bash
# Code update
cd /home/user/edushare
git pull origin main

# Dependencies
source venv/bin/activate
pip install -r requirements.txt --upgrade

# Static files
python manage.py collectstatic --noinput

# Migrations
python manage.py migrate

# Restart service
sudo systemctl restart edushare
```

### Performance Monitoring

```bash
# Server resources
htop

# Nginx status
curl http://127.0.0.1/nginx_status

# Database connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Redis info
redis-cli info
```

## 🆘 Troubleshooting

### Gunicorn not starting

```bash
# Check logs
sudo journalctl -u edushare -n 50

# Check permissions
ls -la /home/user/edushare

# Test manually
cd /home/user/edushare
source venv/bin/activate
gunicorn edushare_project.wsgi:application
```

### Nginx 502 Bad Gateway

```bash
# Check Gunicorn is running
sudo systemctl status edushare

# Check socket/port
netstat -tuln | grep 8000

# Restart services
sudo systemctl restart edushare
sudo systemctl restart nginx
```

### Database connection issues

```bash
# Test PostgreSQL
sudo -u postgres psql -c "SELECT version();"

# Check Django can connect
python manage.py dbshell --settings=edushare_project.settings_production
```

### SSL issues

```bash
# Test renewal
sudo certbot renew --dry-run

# Check certificate
sudo certbot certificates
```

## 📞 Support

- **Documentation**: `SECURITY_README_UZ.md`
- **Issues**: GitHub Issues
- **Email**: admin@yourdomain.com

## ✅ Deployment Complete!

Sizning saytingiz ishga tushdi: **https://yourdomain.com** 🎉

Admin panel: **https://yourdomain.com/admin/**

---

**Important Notes:**
- Regular backup qiling
- Security updates o'rnating
- Logs'larni monitoring qiling
- Performance'ni kuzatib boring
