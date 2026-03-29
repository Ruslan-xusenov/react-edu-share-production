# 🎓 EduShare - Educational Content Sharing Platform

[![Django](https://img.shields.io/badge/Django-5.1-green.svg)](https://www.djangoproject.com/)
[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Security](https://img.shields.io/badge/Security-A+-red.svg)](docs/SECURITY_IMPLEMENTATION.md)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg)](docs/PRODUCTION_READY.md)

EduShare - bu zamonaviy ta'lim kontentini ulashish va boshqarish platformasi. O'qituvchilar video darslar, testlar va topshiriqlar yaratishlari, talabalar esa bilim olishlari va o'z ko'nikmalarini rivojlantirishlari mumkin.

---

## ✨ Asosiy Imkoniyatlar

### 👨‍🏫 O'qituvchilar uchun
- 📹 **Video Darslar** - YouTube yoki to'g'ridan-to'g'ri yuklash.
- 📝 **Testlar va Topshiriqlar** - interaktiv baholash tizimi.
- 📊 **Statistika** - talabalar faoliyatini kuzatish va tahlil.
- 🎯 **Kurs Boshqaruvi** - to'liq kurs yaratish va tahrirlash.
- ⭐ **Reyting Tizimi** - talabalar baholashi va sharhlari.

### 👨‍🎓 Talabalar uchun
- 🎥 **Video Darslar** - sifatli va tartibli ta'lim kontenti.
- ✅ **Online Testlar** - darsdan so'ng bilimni tezkor tekshirish.
- 📚 **Kurs Katalogi** - turli yo'nalishlar bo'yicha kurslar.
- 💬 **Sharhlar** - fikr almashish va savol-javoblar.
- 🏆 **Ball Tizimi** - o'qishni rag'batlantirish (Gamification).
- 📱 **Responsive Design** - barcha mobil va desktop qurilmalarda ishlaydi.

### 🔐 Xavfsizlik (High-Level)
- 🛡️ **Multi-layer Security** - 8 qatlamli himoya tizimi.
- 🚫 **DDoS Protection** - Rate limiting va avtomatik IP bloklash.
- 💉 **SQL Injection Prevention** - real-time detection va ORM protection.
- 🔒 **XSS Protection** - Bleach va CSP (Content Security Policy).
- 👤 **Brute Force Protection** - Django Axes (Login limitlari).

---

## 🚀 O'rnatish va Ishga Tushirish (Quick Start)

### Talablar
- Python 3.10+
- PostgreSQL 13+ (Barcha bazalar hozir PostgreSQL da)
- Redis (Kesh va monitoring uchun)

### Development Muhiti
```bash
# 1. Repozitoriyani yuklab olish
git clone https://github.com/Ruslan-Xusenov/react-edu-share-production.git
cd react-edu-share-production

# 2. Virtual muhit yaratish
python3 -m venv venv
source venv/bin/activate

# 3. Pip paketlarni o'rnatish
pip install -r requirements.txt

# 4. .env faylini to'ldirish (Qarang: .env.example)
cp .env.example .env

# 5. Migration va server
python manage.py migrate
python manage.py runserver
```

---

## 🏭 Production-ga Tayyorlash (Deployment)

Loyiha professional production uchun to'liq optimallashtirilgan.

### Avtomatik Script (Tavsiya etiladi)
```bash
# Serverda quyidagilarni ishga tushiring:
sudo ./deploy.sh
```
Bu skript avtomatik ravishda **Nginx**, **Gunicorn**, **PostgreSQL**, **Redis** va **SSL** (Certbot) ni sozlab beradi.

### Asosiy Production Sozlamalari
- **Database**: PostgreSQL (CONN_MAX_AGE=600)
- **Monitoring**: Sentry integratsiyasi (.env da SENTRY_DSN ni qo'shing)
- **Caching**: Redis-based caching
- **Backups**: Har kuni soat 02:00 da avtomatik backup (`backup.sh`)

---

## 📊 Xavfsizlik Statusi

| Himoya turi | Holati | Uslubi |
| :--- | :--- | :--- |
| **DDoS** | ✅ Faol | Rate-limit (50-120 req/min) |
| **SQLi** | ✅ Bloklangan | ORM + Pattern detection |
| **XSS** | ✅ Bloklangan | Bleach + Escaping + CSP |
| **Brute Force** | ✅ Faol | Axes (5 attempts) |
| **Backdoor** | ✅ Faol | File validation (strict extensions) |
| **SSRF** | ✅ Faol | URL & IP validation |

---

## 🧪 Sifat Kafolati (Testing)

Loyihaning barcha asosiy qismlari **60 tadan ortiq** avtomatik testlar bilan ta'minlangan:
```bash
# Testlarni ishga tushirish (PostgreSQL muhitida)
python manage.py test --settings=edushare_project.test_settings
```

---

## 📁 Loyiha Strukturasi (Asosiy qismlar)

```bash
edushare/
├── accounts/          # Foydalanuvchi profillari va Auth
├── courses/           # Kurslar, Darslar, Testlar va Sertifikatlar
├── community/         # Maqolalar, E'lonlar va Kitob sharhlari
├── core/              # Xavfsizlik tizimi va Middleware
├── edushare_project/  # Loyiha settings va URLs
├── static/            # Statik fayllar (JS, CSS)
├── media/             # Yuklangan videolar va rasmlar
├── deploy.sh          # Deployment script
└── backup.sh          # Backup script
```

---

## 🤝 Aloqa va Yordam

- **Muallif**: [Ruslan Xusenov](https://github.com/Ruslan-xusenov)
- **Email**: ruslanxusenov@gmail.com
- **Hujjatlar**: Batafsil ma'lumotlar `docs/` papkasida saqlangan.

---

**Made with ❤️ in Uzbekistan 🇺🇿**
✅ **Status**: Production Ready | 🛡️ **Security**: Hardened | 🚀 **Engine**: Optimized
