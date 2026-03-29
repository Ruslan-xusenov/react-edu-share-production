# EduShare - Xavfsizlik va Monitoring Tizimi

## 🔒 Joriy qilingan xavfsizlik xususiyatlari

### 1. **User Activity Logging (Foydalanuvchi faolligi kuzatish)**
Har bir foydalanuvchi harakati avtomatik yozib boriladi:
- ✅ Tizimga kirish (Login)
- ✅ Tizimdan chiqish (Logout)  
- ✅ Registratsiya (Google OAuth va Email)
- ✅ Muvaffaqiyatsiz kirish urinishlari
- ✅ IP manzil
- ✅ Qurilma turi (Mobile/Desktop/Tablet)
- ✅ Brauzer va OS ma'lumotlari
- ✅ Vaqt tamg'asi

### 2. **IP Blocking System (IP bloklash tizimi)**
Xavfli IP manzillarni avtomatik va qo'lda bloklash:
- 🔒 Avtomatik bloklash (DDoS hujum belgisi)
- 🔒 Qo'lda bloklash (Admin panel orqali)
- 🔒 Vaqtinchalik va doimiy bloklash
- 🔒 Blok sabablarini saqlash
- 🔒 Urinishlar sonini kuzatish

### 3. **DDoS Himoyasi (Rate Limiting)**
So'rovlar sonini cheklash orqali DDoS hujumdan himoya:
- ⚡ 60 soniyada maksimum 100 so'rov (oddiy sahifalar)
- ⚡ 60 soniyada maksimum 20 so'rov (login/signup sahifalari)
- ⚡ Limitdan oshgan IP larni avtomatik bloklash
- ⚡ 5 marta limit oshsa - doimiy bloklash

### 4. **Brute Force Himoya (django-axes)**
Noto'g'ri parol urinishlarini cheklash:
- 🛡️ 5 marta noto'g'ri parol - 1 soat blok
- 🛡️ IP va user bazasida kuzatish
- 🛡️ Avtomatik lockout sahifasi

---

## 📊 Admin Panel Xususiyatlari

### User Activity Logs
`/admin/core/useractivitylog/` sahifasida:
- Barcha foydalanuvchi faolligi
- IP manzil bo'yicha qidiruv
- Vaqt bo'yicha filtrlash
- Qurilma va brauzer statistikasi
- Joylashuv ma'lumotlari (Country/City)

### IP Blocklist
`/admin/core/ipblocklist/` sahifasida:
- Bloklangan IP larni ko'rish
- Yangi IP bloklash
- Vaqtinchalik/Doimiy bloklash
- Blok sabablarini ko'rish
- Bulk actions (bir nechta IP ni birdaniga bloklash)

---

## 🖥️ Management Commands

### Statistika ko'rish
```bash
./venv/bin/python manage.py activity_stats
```

Oxirgi 7 kunlik statistika (default):
```bash
./venv/bin/python manage.py activity_stats --days 7
```

Oxirgi 30 kunlik statistika:
```bash
./venv/bin/python manage.py activity_stats --days 30
```

**Natija:**
- Foydalanuvchilar soni
- Login statistikasi
- Qurilma turlari (Mobile/Desktop/Tablet)
- Top 5 IP manzillar
- Bloklangan IP lar
- Oxirgi 10 ta faollik

---

## 🔧 Texnik Ma'lumotlar

### Models (core/models.py)
1. **UserActivityLog** - Barcha foydalanuvchi faolligini saqlaydi
   - Fields: user, activity_type, ip_address, user_agent, device_type, browser, os, country, city, success, timestamp
   - Indexlar: timestamp, ip_address, user+timestamp

2. **IPBlocklist** - Bloklangan IP larni saqlaydi
   - Fields: ip_address, reason, description, blocked_at, blocked_until, is_permanent, attempt_count
   - Method: is_active() - Blok faolmi?

### Middleware (core/middleware.py)
- **SecurityMiddleware** - Har bir request da:
  1. IP bloklangan yoki yo'qligini tekshiradi
  2. Rate limiting tekshiradi
  3. Shubhali faollikni log qiladi
  4. Avtomatik bloklaydi

### Signals (core/signals.py)
Avtomatik event tracking:
- `user_logged_in` → UserActivityLog (login)
- `user_logged_out` → UserActivityLog (logout)
- `user_signed_up` → UserActivityLog (registration)
- `user_locked_out` → UserActivityLog (failed_login)

---

## ⚙️ Sozlash

### 1. Migratsiyalarni qo'llash
```bash
./venv/bin/python manage.py makemigrations
./venv/bin/python manage.py migrate
```

### 2. Superuser yaratish (agar yo'q bo'lsa)
```bash
./venv/bin/python manage.py createsuperuser
```

### 3. Serverni ishga tushirish
```bash
./venv/bin/python manage.py runserver
```

### 4. Admin panelga kirish
http://127.0.0.1:8000/admin/

---

## 🎯 Qanday ishlaydi?

### Login scenarios:

**1. Oddiy login (muvaffaqiyatli):**
```
User kirdi → Signal (user_logged_in) → UserActivityLog yaratiladi
                                       ↓
                                    IP, Browser, Qurilma saqlandi
```

**2. Noto'g'ri parol (5 marta):**
```
5x noto'g'ri parol → django-axes bloklaydi → Signal (user_locked_out)
                                              ↓
                                          UserActivityLog (failed_login)
                                              ↓
                                          1 soat blok
```

**3. DDoS hujum (100+ so'rov/min):**
```
101-chi so'rov → SecurityMiddleware → Rate limit oshdi
                                      ↓
                                  IPBlocklist yaratiladi (1 soat)
                                      ↓
                                  403 Forbidden
```

**4. 5 marta DDoS urinish:**
```
5x rate limit → IPBlocklist.attempt_count = 5 → is_permanent = True
                                                ↓
                                            Doimiy blok!
```

---

## 🚀 Kelajakda qo'shilishi mumkin

- [ ] Geolocation API integratsiyasi (haqiqiy Country/City)
- [ ] Email notifications (shubhali login)
- [ ] 2FA (Two-Factor Authentication)
- [ ] Session management (bir vaqtda bir qurilmadan kirish)
- [ ] Advanced dashboard (grafik va diagramma)
- [ ] Export logs (CSV/Excel)
- [ ] Webhook integrations (Telegram bot alerts)

---

## 📝 Misol loglar

### UserActivityLog:
```
[2026-02-02 14:30:15] admin@example.com - Tizimga kirish - 192.168.1.1
    Qurilma: desktop | Google Chrome
    OS: Windows
    Holat: ✅ Muvaffaqiyatli
```

### IPBlocklist:
```
192.168.1.100 - DDoS hujum
    Bloklangan: 2026-02-02 14:25:00
    Sabab: 5 marta rate limit oshdi
    Holat: 🔒 Doimiy bloklangan
```

---

## 🆘 Yordam

Agar biror IP xato bloklangan bo'lsa:
1. Admin panelga kiring: `/admin/`
2. "IP Bloklashlar" bo'limiga o'ting
3. IP ni toping va "O'chirish" tugmasini bosing

Yoki:
```bash
./venv/bin/python manage.py shell
>>> from core.models import IPBlocklist
>>> IPBlocklist.objects.filter(ip_address='192.168.1.1').delete()
```

---

✅ **Tizim tayyor va ishlayapti!**
