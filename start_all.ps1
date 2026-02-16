# EduShare Startup Script (Windows)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   EDUSHARE - STARTING ALL SERVICES      " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 0. Clean up existing processes on ports 8000 and 5173
Write-Host "Eski jarayonlar tozalanmoqda..." -ForegroundColor Gray
$ports = 8000, 5173
foreach ($port in $ports) {
    $procId = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue).OwningProcess | Select-Object -Unique
    if ($procId) {
        Write-Host "Port $port dagi jarayon ($procId) to'xtatildi." -ForegroundColor DarkGray
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
}

# 1. Start Backend (Django)
Write-Host "[1/2] Backend ishga tushirilmoqda (Django)..." -ForegroundColor Yellow
if (Test-Path ".\venv\Scripts\python.exe") {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", ".\venv\Scripts\python manage.py runserver"
}
else {
    Write-Host "XATO: Virtual muhit (venv) topilmadi!" -ForegroundColor Red
    exit
}

# 2. Start Frontend (React/Vite)
Write-Host "[2/2] Frontend ishga tushirilmoqda (Vite)..." -ForegroundColor Yellow
$npmPath = where.exe npm 2>$null
if ($npmPath) {
    Set-Location frontend
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm install --legacy-peer-deps; npm run dev"
    Set-Location ..
}
else {
    Write-Host "--------------------------------------------------" -ForegroundColor DarkRed
    Write-Host "DIQQAT: Tizimda Node.js/npm topilmadi!" -ForegroundColor Red
    Write-Host "Frontendni ishga tushirish uchun Node.js kerak." -ForegroundColor Red
    Write-Host "Yuklab olish: https://nodejs.org/" -ForegroundColor Cyan
    Write-Host "--------------------------------------------------" -ForegroundColor DarkRed
}

Write-Host "`nBarcha buyruqlar yuborildi. Alohida oynalarni tekshiring." -ForegroundColor Green
Write-Host "Backend: http://127.0.0.1:8000" -ForegroundColor Gray
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Gray
