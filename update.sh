#!/bin/bash

# EduShare Update Script
# Bu scriptni /home/react-edu-share-production papkasida ishga tushiring

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
git fetch --all
git reset --hard origin/main

# 2. Virtual environment'ni faollashtirish va o'zgaruvchilarni yuklash
echo "2. Muhit tayyorlanmoqda..."
if [ -f .env.production ]; then
    export $(grep -v '^#' .env.production | xargs)
    echo "  - .env.production yuklandi"
fi
source venv/bin/activate
pip install -r requirements.txt

# 3. Keshni va eski fayllarni tozalash
echo "3. Eskilar tozalanmoqda..."
rm -rf staticfiles/*
rm -rf frontend/dist/*
# Redis keshini tozalash (agar redis o'rnatilgan bo'lsa)
if command -v redis-cli > /dev/null; then
    redis-cli flushall || true
    echo "  - Redis keshi tozalandi"
fi

# 4. Frontend'ni qayta yig'ish
echo "4. Frontend yig'ilmoqda..."
cd frontend
# Muhim: .env.production ni .env ga nusxalash (Vite build uchun)
if [ -f .env.production ]; then
    cp .env.production .env
fi
npm install --legacy-peer-deps
npm run build
cd ..

# 5. Django yangilanmoqda...
echo "5. Django yangilanmoqda..."
python manage.py collectstatic --noinput --settings=edushare_project.settings_production
python manage.py migrate --noinput --settings=edushare_project.settings_production

# 6. Server qayta ishga tushirilmoqda...
echo "6. Server qayta ishga tushirilmoqda..."
sudo systemctl restart edushare
sudo systemctl restart nginx

echo "========================================="
echo -e "${GREEN}✓ Muvaffaqiyatli yangilandi!${NC}"
echo "✓ ILTIMOS: Brauzeringiz keshini tozalang (Ctrl + F5)"
echo "========================================="