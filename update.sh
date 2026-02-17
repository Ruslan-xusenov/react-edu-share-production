#!/bin/bash

# EduShare Update Script
# Bu scriptni /var/www/edushare papkasida ishga tushiring

set -e

GREEN='\033[0;32m'
NC='\033[0m'

echo "========================================="
echo "  EduShare - Kodni Yangilash"
echo "========================================="

# Avtomatik ravishda script joylashgan papkani aniqlash
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $PROJECT_DIR

# 1. GitHub'dan yangi kodni olish
echo "1. GitHub'dan yangi kod yuklanmoqda..."
git pull origin main

# 2. Virtual environment'ni faollashtirish va dependecies'ni yangilash
echo "2. Python kutubxonalari yangilanmoqda..."
source venv/bin/activate
pip install -r requirements.txt

# 3. Frontend'ni qayta yig'ish (agar o'zgarish bo'lsa)
echo "3. Frontend yig'ilmoqda..."
cd frontend
npm install
npm run build
cd ..

# 4. Django static fayllarni yig'ish va bazani migrate qilish
echo "4. Django yangilanmoqda..."
python manage.py collectstatic --noinput --settings=edushare_project.settings_production
python manage.py migrate --settings=edushare_project.settings_production

# 5. Xizmatlarni qayta ishga tushirish
echo "5. Server qayta ishga tushirilmoqda..."
sudo systemctl restart edushare
sudo systemctl restart nginx

echo "========================================="
echo -e "${GREEN}✓ Muvaffaqiyatli yangilandi!${NC}"
echo "========================================="