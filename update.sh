#!/bin/bash
# ============================================
# EduShare - Avtomatik Yangilash Skripti
# Foydalanish: ./update.sh
# ============================================

set -e

# Ranglar
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_DIR="/home/react-edu-share-production"
FRONTEND_DIR="$PROJECT_DIR/frontend"
VENV="$PROJECT_DIR/venv/bin/activate"

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   🚀 EduShare — Avtomatik Yangilash      ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

cd "$PROJECT_DIR"

# 1. GitHub'dan yangilanishlarni olish
echo -e "${YELLOW}[1/6]${NC} GitHub'dan yangilanishlar olinmoqda..."
git fetch origin main
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    echo -e "${GREEN}✓ Hech qanday yangilanish yo'q. Server allaqachon eng so'nggi versiyada.${NC}"
    exit 0
fi

echo -e "${YELLOW}      Yangi o'zgarishlar topildi. Yuklanmoqda...${NC}"
# Git pull vaqtida untracked fayllar (package-lock.json) bilan xatolik bo'lmasligi uchun tozalash
git clean -fd package-lock.json 2>/dev/null || true
git pull origin main

# 2. O'zgargan fayllarni aniqlash
CHANGED_FILES=$(git diff --name-only "$LOCAL" "$REMOTE")
echo -e "${GREEN}✓ O'zgargan fayllar:${NC}"
echo "$CHANGED_FILES" | head -20

FRONTEND_CHANGED=false
BACKEND_CHANGED=false
REQUIREMENTS_CHANGED=false

if echo "$CHANGED_FILES" | grep -q "^frontend/"; then
    FRONTEND_CHANGED=true
fi

if echo "$CHANGED_FILES" | grep -q -E "^(accounts|courses|core|edushare_project|templates)/"; then
    BACKEND_CHANGED=true
fi

if echo "$CHANGED_FILES" | grep -q "requirements.txt"; then
    REQUIREMENTS_CHANGED=true
fi

# 3. Python kutubxonalarini yangilash (agar kerak bo'lsa)
if [ "$REQUIREMENTS_CHANGED" = true ]; then
    echo -e "${YELLOW}[2/6]${NC} Python kutubxonalari yangilanmoqda..."
    source "$VENV"
    pip install -r requirements.txt --quiet
    echo -e "${GREEN}✓ Kutubxonalar yangilandi${NC}"
else
    echo -e "${GREEN}[2/6] Kutubxonalar o'zgarmagan — o'tkazildi${NC}"
fi

# 4. Frontend build (agar kerak bo'lsa)
if [ "$FRONTEND_CHANGED" = true ]; then
    echo -e "${YELLOW}[3/6]${NC} Frontend qayta build qilinmoqda..."
    cd "$FRONTEND_DIR"
    npm install --legacy-peer-deps --silent 2>/dev/null
    npm run build
    cd "$PROJECT_DIR"
    echo -e "${GREEN}✓ Frontend build tayyor${NC}"
else
    echo -e "${GREEN}[3/6] Frontend o'zgarmagan — o'tkazildi${NC}"
fi

# 5. Django migratsiyalar va statik fayllar
if [ "$BACKEND_CHANGED" = true ] || [ "$FRONTEND_CHANGED" = true ]; then
    echo -e "${YELLOW}[4/6]${NC} Django migratsiyalar va statik fayllar..."
    source "$VENV"
    python manage.py migrate --noinput 2>/dev/null || true
    python manage.py collectstatic --noinput --clear 2>/dev/null
    echo -e "${GREEN}✓ Migratsiyalar va statiklar tayyor${NC}"
else
    echo -e "${GREEN}[4/6] Backend o'zgarmagan — o'tkazildi${NC}"
fi

# 5.1 Google OAuth sozlash (har doim tekshiriladi)
echo -e "${YELLOW}[4.5/6]${NC} Google OAuth SocialApp tekshirilmoqda..."
source "$VENV"
python manage.py setup_google_oauth 2>/dev/null || true
echo -e "${GREEN}✓ Google OAuth sozlandi${NC}"

# 6. Xizmatlarni qayta ishga tushirish
echo -e "${YELLOW}[5/6]${NC} Gunicorn qayta ishga tushirilmoqda..."
sudo systemctl restart edushare
echo -e "${GREEN}✓ Gunicorn qayta ishladi${NC}"

echo -e "${YELLOW}[6/6]${NC} Nginx qayta ishga tushirilmoqda..."
sudo nginx -t 2>/dev/null && sudo systemctl restart nginx
echo -e "${GREEN}✓ Nginx qayta ishladi${NC}"

# Natija
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   ✅ Yangilash muvaffaqiyatli tugadi!     ║${NC}"
echo -e "${CYAN}║   🌐 https://edushare.uz                 ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Vaqt: $(date '+%Y-%m-%d %H:%M:%S')${NC}"