# 🛡️ EduShare - Xavfsizlik Hujjati

Bu hujjat EduShare platformasidagi xavfsizlik choralarini batafsil tushuntiradi.

## 📋 Himoya Darajalari

### 1. **DDoS Himoyasi** ✅
- **Rate Limiting**: Har bir IP uchun so'rovlar soni cheklangan
  - Oddiy sahifalar: 120 so'rov/daqiqa
  - API endpointlar: 50 so'rov/daqiqa  
  - Login/Signup: 10 so'rov/daqiqa
- **Avtomatik Bloklash**: 3 marta rate limit oshsa, IP doimiy bloklanadi
- **Cache**: Tez ishlash uchun blok ro'yxati cache da saqlanadi

### 2. **SQL Injection Himoyasi** ✅
- **Django ORM**: Avtomatik parametrized queries
- **Pattern Detection**: Xavfli SQL pattern'lar aniqlanadi:
  - `SELECT`, `UNION`, `INSERT`, `UPDATE`, `DELETE`
  - `DROP TABLE`, `EXEC`, `xp_cmdshell`
  - Comment injection: `--`, `#`, `/* */`
- **Input Sanitization**: Barcha input data tozalanadi
- **Avtomatik Bloklash**: SQL injection urinishlari darhol IP ni bloklaydi

### 3. **XSS (Cross-Site Scripting) Himoyasi** ✅
- **Bleach Library**: HTML tozalash
- **Pattern Detection**: Xavfli JavaScript pattern'lar:
  - `<script>` taglari
  - `javascript:` protokol
  - Event handler'lar: `onerror`, `onload`, `onclick`
  - `eval()`, `expression()` funksiyalari
- **Content Security Policy (CSP)**: Browser-da XSS ni bloklaydi
- **Output Sanitization**: Barcha output HTML escape qilinadi

### 4. **Backdoor Prevention** ✅
- **File Upload Security**:
  - Xavfli kengaytmalar bloklangan: `.exe`, `.sh`, `.php`, `.py`, va boshqalar
  - Content-Type validation
  - Double extension attack detection
  - Null byte injection prevention
  - File size limiti: 10MB
- **Path Traversal Blocking**: `../../` kabi pattern'lar bloklangan
- **Code Execution Prevention**: Hech qanday executabledki fayl yuklanmaydi

### 5. **CSRF (Cross-Site Request Forgery) Himoyasi** ✅
- Django CSRF middleware
- Token validation har bir POST so'rovda
- SameSite cookie policy

### 6. **Brute Force Himoyasi** ✅
- **Django Axes**: Login urinishlarini kuzatadi
  - 5 marta noto'g'ri kirishdan keyin 1 soat bloklash
  - Username VA IP address kombinatsiyasi
  - Database da login attempt'lar saqlanadi
- **Password Policy**:
  - Minimum 10 belgi
  - Oddiy parollar man etilgan
  - User ma'lumotlariga o'xshash parollar man etilgan

### 7. **SSRF (Server-Side Request Forgery) Himoyasi** ✅
- URL validation
- Faqat HTTP/HTTPS protokollariga ruxsat
- Local IP addresslarga so'rov yuborish bloklangan:
  - `localhost`, `127.0.0.1`
  - Private networks: `192.168.x.x`, `10.x.x.x`

### 8. **Additional Security Layers** ✅
- **Security Headers**:
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - X-XSS-Protection: 1; mode=block
  - Referrer-Policy: strict-origin-when-cross-origin
- **HTTPS Only** (Production):
  - Secure cookies
  - HSTS (HTTP Strict Transport Security)
- **CORS Policy**: Faqat ruxsat etilgan origin'larga
- **Input Validation**: Barcha user input validatsiya qilinadi

## 🚀 Ishga Tushirish

### 1. Dependencies o'rnatish

\`\`\`bash
source venv/bin/activate
pip install -r requirements.txt
\`\`\`

### 2. Migration

\`\`\`bash
python manage.py makemigrations
python manage.py migrate
\`\`\`

### 3. Static files

\`\`\`bash
python manage.py collectstatic --noinput
\`\`\`

### 4. Serverni ishga tushirish

\`\`\`bash
python manage.py runserver
\`\`\`

## 📊 Monitoring va Logging

### Log Files

- `logs/edushare.log`: Umumiy loglar
- `logs/security.log`: Xavfsizlik hodisalari

### Security Events

Quyidagi hodisalar log qilinadi:
- IP bloklash
- SQL injection urinishlari
- XSS attack urinishlari
- Path traversal urinishlari
- Rate limit oshish
- Brute force urinishlari

### Loglarni ko'rish

\`\`\`bash
# Hamma xavfsizlik loglarini ko'rish
tail -f logs/security.log

# SQL injection urinishlarini topish
grep "SQL_INJECTION" logs/security.log

# Bloklangan IP larni ko'rish
grep "IP_BLOCKED" logs/security.log
\`\`\`

## 🔧 Admin Panel

### IP Blocklist Management

Admin panel orqali IP addresslarni qo'lda bloklash/oq ro'yxatga qo'shish mumkin:

1. Admin panelga kiring: `/admin/`
2. **Core** → **IP Blocklist** ga o'ting
3. Yangi IP qo'shish yoki mavjudlarini tahrirlash

### User Activity Logs

Barcha user harakatlarini ko`rish:

1. Admin panel → **Core** → **User Activity Logs**
2. Filter: IP, user, activity type, date range

## 🛠️ Xavfsizlikni Yanada Oshirish

### Production uchun tavsiyalar:

1. **Environment Variables** to'g'ri sozlash:
   \`\`\`env
   DEBUG=False
   SECRET_KEY=<juda-murakkab-kalit>
   ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
   \`\`\`

2. **HTTPS** ni yoqish (Nginx/Apache):
   - SSL sertifikat o'rnatish (Let's Encrypt)
   - SECURE_SSL_REDIRECT=True

3. **Database** xavfsizligi:
   - PostgreSQL ishlatish
   - Strong password
   - Database firewall

4. **Cloudflare** yoki boshqa CDN/DDoS himoyasi
  
5. **Regular Updates**:
   \`\`\`bash
   pip list --outdated
   pip install --upgrade <package>
   \`\`\`

6. **Backup Strategy**:
   - Database backup (kunlik)
   - Media files backup
   - Code repository (Git)

## 📈 Performance Optimization

Xavfsizlik bilan birga tezlikni saqlash:

1. **Caching**: Redis yoki Memcached
2. **Database Indexing**: Tez-tez qidiriluvchi fieldlar
3. **Static Files**: CDN ishlatish
4. **Async Tasks**: Celery (email, notifications)

## 🐛 Troubleshooting

### "IP bloklangan" xatosi

Agar o'zingizni tasodifan bloklab qo'ygan bo'lsangiz:

\`\`\`bash
python manage.py shell
>>> from core.models import IPBlocklist
>>> IPBlocklist.objects.filter(ip_address='YOUR_IP').delete()
\`\`\`

### Rate limit oshdi

Cache ni tozalash:

\`\`\`bash
python manage.py shell
>>> from django.core.cache import cache
>>> cache.clear()
\`\`\`

### Axes bloklagan

\`\`\`bash
python manage.py axes_reset
\`\`\`

## 📞 Support

Xavfsizlik muammolari topilsa:

1. GitHub Issues: [link]
2. Email: security@edushare.uz
3. Admin contact: ruslanxusenov@gmail.com

## ✅ Security Checklist

- [x] DDoS himoyasi
- [x] SQL Injection prevention
- [x] XSS prevention
- [x] CSRF protection
- [x] Backdoor prevention
- [x] Brute force protection
- [x] SSRF prevention
- [x] Path traversal blocking
- [x] File upload security
- [x] Input validation
- [x] Output sanitization
- [x] Security headers
- [x] Logging va monitoring
- [x] Rate limiting
- [x] IP blocking

---

**Muhim**: Ushbu himoya choralari 100% kafolatlamaydi, lekin platformangizni ko'pchilik hujumlardan saqlaydi. Doimiy yangilanish va monitoring kerak!
