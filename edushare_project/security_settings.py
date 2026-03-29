"""
Advanced Security Settings - settings.py ga import qiling
"""

# =============================================================================
# ADVANCED SECURITY CONFIGURATIONS
# =============================================================================

import os

# CORS Settings - Cross-Origin Resource Sharing
CORS_ALLOWED_ORIGINS = os.getenv(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000,https://edushare.uz,https://www.edushare.uz'
).split(',')
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# 🛡️ Content Security Policy (CSP) - 'django-csp' 4.0+ format
CONTENT_SECURITY_POLICY = {
    'DIRECTIVES': {
        'default-src': ("'self'",),
        'script-src': (
            "'self'", 
            "'unsafe-inline'", 
            "'unsafe-eval'", 
            "https://cdn.jsdelivr.net",
            "https://code.jquery.com",
            "https://stackpath.bootstrapcdn.com",
            "https://www.youtube.com",
            "https://s.ytimg.com",
        ),
        'style-src': (
            "'self'", 
            "'unsafe-inline'", 
            "https://stackpath.bootstrapcdn.com",
            "https://cdn.jsdelivr.net",
            "https://fonts.googleapis.com",
        ),
        'img-src': ("'self'", "data:", "https:", "https://ui-avatars.com"),
        'font-src': (
            "'self'", 
            "https://fonts.gstatic.com",
            "https://stackpath.bootstrapcdn.com",
        ),
        'connect-src': ("'self'", "https://edushare.uz", "https://openrouter.ai", "http://127.0.0.1:8000"),
        'media-src': ("'self'", "https:", "http:", "blob:", "data:"),
        'frame-src': ("'self'", "https://www.youtube.com", "https://youtube.com"),
        'frame-ancestors': ("'none'",),
        'base-uri': ("'self'",),
        'form-action': ("'self'",),
    }
}

# Advanced Axes Configuration - Brute Force himoyasi
AXES_FAILURE_LIMIT = 10  # 10 marta noto'g'ri urinishdan keyin bloklash (3 o'rniga)
AXES_COOLOFF_TIME = 2  # 2 soat bloklash
AXES_RESET_ON_SUCCESS = True
AXES_LOCKOUT_TEMPLATE = 'accounts/lockout.html'
AXES_HANDLER = 'axes.handlers.database.AxesDatabaseHandler'
AXES_LOCKOUT_PARAMETERS = [['ip_address', 'username']] # IP va Username bo'yicha bloklash (VPN yordam bermaydi)
AXES_BEHIND_REVERSE_PROXY = True
AXES_IP_GETTER = 'core.security_utils.get_client_ip'
AXES_ONLY_ADMIN_SITE = False  # Butun saytni himoyalash
AXES_ENABLE_ACCESS_FAILURE_LOG = True
AXES_RESET_COOL_OFF_ON_FAILURE_DURING_LOCKOUT = True

# Request/Response Limits - DoS himoyasi
DATA_UPLOAD_MAX_MEMORY_SIZE = 10485760  # 10MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 10485760  # 10MB
DATA_UPLOAD_MAX_NUMBER_FIELDS = 1000  # Maksimal field lar soni

# Password Security - Qattiqroq parol talablari
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 10,  # Kamida 10 belgili parol
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
    # 🚀 MUSTAQIL QO'SHILGAN: Katta harf va belgi talablari
    {
        'NAME': 'accounts.validators.ComplexityValidator',
    },
]

# Input Sanitization Settings
BLEACH_ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3']
BLEACH_ALLOWED_ATTRIBUTES = {'a': ['href', 'title'], '*': ['class']}
BLEACH_STRIP_TAGS = True

# Rate Limiting Settings (global)
RATELIMIT_ENABLE = True
RATELIMIT_USE_CACHE = 'default'

# 🛡️ REST Framework - No-Brute-Force limits
REST_FRAMEWORK_THROTTLE_RATES = {
    'anon': '30/minute',   # 60 dan 30 ga kamaytirildi
    'user': '100/minute',  # 300 dan 100 ga kamaytirildi
    'auth_login': '5/minute', # Login urinishlarini qat'iy cheklash
    'auth_signup': '3/minute', # Signup uchun yanada qat'iy
}
