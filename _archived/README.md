# 📦 Arxivlangan Fayllar

Ushbu papka loyihaning eski va ishlatilmayotgan qismlarini o'z ichiga oladi. Bu fayllar React frontend yaratilishidan oldin ishlatilgan edi.

## 📅 Arxivlash Sanasi
5-fevral, 2026

## 📂 Arxivlangan Qismlar

### 1. Templates (Eski Django Template'lar)
- `templates/base.html` - Asosiy Django template
- `templates/core/` - Core app uchun template'lar
  - `home.html` - Eski bosh sahifa
  - `about.html` - Eski haqida sahifasi
  - `leaderboard.html` - Eski reyting ro'yxati
  - `notifications.html` - Eski bildirishnomalar
- `templates/courses/` - Courses app uchun template'lar
  - `course_list.html`
  - `category_detail.html`
  - `lesson_detail.html`
  - `my_learning.html`
  - `my_lessons.html`
  - `create_lesson.html`
  - `edit_lesson.html`
  - `submit_assignment.html`
- `templates/accounts/` - Accounts app uchun template'lar

### 2. Static Files (Eski CSS/JS/Images)
- `static/css/style.css` - Eski CSS fayllar
- `static/js/` - Eski JavaScript fayllar
- `static/images/` - Eski rasmlar

## ⚡ Nima O'zgartirildi?

**Eski Struktura:** Django Server-Side Rendering (SSR) bilan Template'lar
**Yangi Struktura:** React SPA (Single Page Application) + Django API (DRF)

## 🚀 Yangi Frontend Texnologiyalari

1. **React 19** - Modern UI komponentlar
2. **Vite** - Tez build tool
3. **React Router** - Client-side routing
4. **Framer Motion** - Premium animatsiyalar
5. **Axios** - API integratsiya
6. **React Helmet** - SEO optimizatsiya

## 📋 Qayta Tiklash

Agar biron sababga ko'ra eski template'larni qayta tiklashingiz kerak bo'lsa:

```bash
# Barcha arxivlangan fayllarni qayta tiklash
mv _archived/templates/* templates/
mv _archived/static/* static/
```

## ⚠️ Muhim Eslatma

Bu fayllar faqat tarixiy maqsadlarda saqlanmoqda. Yangi frontend React bilan to'liq qayta yozilgan va zamonaviy best practice'larga mos keladi.

---

Made with ❤️ in Uzbekistan 🇺🇿
