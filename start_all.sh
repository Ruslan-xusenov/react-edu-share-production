#!/bin/bash

# EduShare Startup Script (Linux/Mac)
# Ranglar
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}   EDUSHARE - STARTING ALL SERVICES      ${NC}"
echo -e "${CYAN}==========================================${NC}"

# 0. Clean up existing processes on ports 8000 and 5173
echo -e "${GRAY}Eski jarayonlar tozalanmoqda...${NC}"
for port in 8000 5173; do
    pid=$(lsof -t -i:$port)
    if [ ! -z "$pid" ]; then
        echo -e "${GRAY}Port $port dagi jarayon ($pid) to'xtatildi.${NC}"
        kill -9 $pid 2>/dev/null
    fi
done

# 1. Start Backend (Django)
echo -e "${YELLOW}[1/2] Backend ishga tushirilmoqda (Django)...${NC}"
if [ -f "venv/bin/python" ]; then
    # Daemonsiz logga yozib ishga tushiramiz
    nohup venv/bin/python manage.py runserver 0.0.0.0:8000 > backend.log 2>&1 &
    echo -e "${GREEN}Backend http://127.0.0.1:8000 da ishga tushdi (Log: backend.log)${NC}"
else
    echo -e "${RED}XATO: Virtual muhit (venv) topilmadi!${NC}"
    echo -e "${YELLOW}Iltimos: python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt${NC}"
    exit 1
fi

# 2. Start Frontend (React/Vite)
echo -e "${YELLOW}[2/2] Frontend ishga tushirilmoqda (Vite)...${NC}"
if [ -d "frontend" ]; then
    cd frontend
    if [ -d "node_modules" ]; then
        nohup npm run dev -- --host > ../frontend.log 2>&1 &
    else
        echo -e "${GRAY}node_modules topilmadi, instalatsiya qilinmoqda...${NC}"
        npm install --legacy-peer-deps
        nohup npm run dev -- --host > ../frontend.log 2>&1 &
    fi
    cd ..
    echo -e "${GREEN}Frontend http://localhost:5173 da ishga tushdi (Log: frontend.log)${NC}"
else
    echo -e "${RED}XATO: 'frontend' papkasi topilmadi!${NC}"
fi

echo -e "\n${GREEN}Barcha xizmatlar fon rejimida (background) ishlamoqda.${NC}"
echo -e "${GRAY}Loglarni ko'rish uchun: tail -f backend.log yoki tail -f frontend.log${NC}"
echo -e "${GRAY}To'xtatish uchun: pkill -f runserver && pkill -f vite${NC}"
