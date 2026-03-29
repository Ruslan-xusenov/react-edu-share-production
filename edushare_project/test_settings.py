"""
Test settings — PostgreSQL bilan testlarni ishga tushirish uchun.
Foydalanish: python manage.py test --settings=edushare_project.test_settings
"""
from .settings import *  # noqa: F401,F403

# Test uchun PostgreSQL (asosiy settings.py dagi konfiguratsiya ishlatiladi)
# Django avtomatik test_edushare_db yaratadi va o'chiradi

# Testlarda Sentry kerak emas
import sentry_sdk
sentry_sdk.init()  # DSN siz — hech narsa yubormaydi

# Test uchun LocMemCache (Redis kerak emas)
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}

# Test tezligi uchun parol hashing ni soddalashtirish
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

# Testlarda email yubormaslik
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

# SSL redirect testlarda o'chirish (HTTP test client uchun)
SECURE_SSL_REDIRECT = False
