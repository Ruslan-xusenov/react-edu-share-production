from pathlib import Path
import os
from dotenv import load_dotenv

load_dotenv(override=True)

BASE_DIR = Path(__file__).resolve().parent.parent



SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-default-change-me-in-production')
DEBUG = os.getenv('DEBUG', 'False') == 'True'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = os.getenv('CSRF_TRUSTED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(',')
ALLOWED_API_IPS = os.getenv('ALLOWED_API_IPS', '127.0.0.1').split(',')
INSTALLED_APPS = [
    'jazzmin',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',
    'django.contrib.sitemaps',
    
    # Third-party security apps
    'corsheaders',
    'csp',
    
    # REST API
    'rest_framework',
    'django_filters',
    
    # Authentication
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'crispy_forms',
    'crispy_bootstrap4',
    
    # Custom apps
    'accounts',
    'courses',
    'core',
    'community',
    
    # Security
    'axes',
]

MIDDLEWARE = [
    'django.middleware.gzip.GZipMiddleware',  # 🚀 Kompressiya (JSON hajmini kamaytiradi)
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',  # CORS himoyasi
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'csp.middleware.CSPMiddleware',  # Content Security Policy
    'allauth.account.middleware.AccountMiddleware',
    'axes.middleware.AxesMiddleware',  # Brute-force himoyasi
    'core.middleware.AdvancedSecurityMiddleware',  # DDoS, SQL Injection, XSS himoyasi
]

ROOT_URLCONF = 'edushare_project.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            BASE_DIR / 'templates',
            BASE_DIR / 'frontend' / 'dist',
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'django.template.context_processors.media',
                'core.context_processors.notifications_processor',
            ],
        },
    },
]

WSGI_APPLICATION = 'edushare_project.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
        'OPTIONS': {
            'timeout': 60,  # 🚀 Timoutni oshirish (lock xatolarini oldini olish)
        },
    }
}

# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.postgresql',
#         'NAME': os.getenv('DATABASE_NAME', 'edushare_db'),
#         'USER': os.getenv('DATABASE_USER', 'postgres'),
#         'PASSWORD': os.getenv('DATABASE_PASSWORD', ''),
#         'HOST': os.getenv('DATABASE_HOST', 'localhost'),
#         'PORT': os.getenv('DATABASE_PORT', '5432'),
#     }
# }



AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]



LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'Asia/Tashkent'

USE_I18N = True

USE_TZ = True



STATIC_URL = 'static/'
STATICFILES_DIRS = [
    BASE_DIR / 'static',
    BASE_DIR / 'frontend' / 'dist',
]
STATIC_ROOT = BASE_DIR / 'staticfiles'

# WhiteNoise Configuration
WHITENOISE_USE_FINDERS = True
WHITENOISE_MANIFEST_STRICT = False
WHITENOISE_ALLOW_ALL_ORIGINS = True

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Cache Configuration (Rate limiting uchun)
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'edushare-cache',
        'OPTIONS': {
            'MAX_ENTRIES': 10000
        }
    }
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_USER_MODEL = 'accounts.CustomUser'

SITE_ID = 1

AUTHENTICATION_BACKENDS = [
    'axes.backends.AxesBackend',
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
]

ACCOUNT_AUTHENTICATION_METHOD = 'email'
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_USERNAME_REQUIRED = False
ACCOUNT_EMAIL_VERIFICATION = 'optional'
# Frontend URL for redirects
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')

LOGIN_REDIRECT_URL = FRONTEND_URL + '/?auth=success'
ACCOUNT_LOGOUT_REDIRECT_URL = FRONTEND_URL
ACCOUNT_SIGNUP_REDIRECT_URL = FRONTEND_URL + '/?auth=success'
ACCOUNT_SIGNUP_PASSWORD_ENTER_TWICE = False
SOCIALACCOUNT_LOGIN_ON_GET = True
SOCIALACCOUNT_ADAPTER = 'accounts.adapters.CustomSocialAccountAdapter'
SOCIALACCOUNT_AUTO_SIGNUP = True
SOCIALACCOUNT_QUERY_EMAIL = True
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_UNIQUE_EMAIL = True
SOCIALACCOUNT_EMAIL_AUTHENTICATION = True
SOCIALACCOUNT_EMAIL_AUTHENTICATION_AUTO_CONNECT = True

SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': [
            'profile',
            'email',
        ],
        'AUTH_PARAMS': {
            'access_type': 'online',
        },
        # APP sozlamalari bu yerda emas — bazada saqlanadi
        # (python manage.py setup_google_oauth orqali)
    }
}

CRISPY_ALLOWED_TEMPLATE_PACKS = "bootstrap4"
CRISPY_TEMPLATE_PACK = "bootstrap4"

LOGIN_URL = '/accounts/login/'

# Django REST Framework Settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.BasicAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 12,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    # Renderers: BrowsableAPI faqat debug rejimda (RAM tejaladi)
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ] + (['rest_framework.renderers.BrowsableAPIRenderer'] if DEBUG else []),
    # Rate limiting — DDoS va API abuse oldini olish
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '60/minute',
        'user': '300/minute',
    },
}


# Security Settings
if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'False') == 'True'
    SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'True') == 'True'
    CSRF_COOKIE_SECURE = os.getenv('CSRF_COOKIE_SECURE', 'True') == 'True'
    X_FRAME_OPTIONS = 'DENY'
    # HSTS settings
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
else:
    # Development settings
    SECURE_SSL_REDIRECT = False
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False

# Proxy Settings - Real IP olish uchun
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Email Configuration
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', EMAIL_HOST_USER)

# CSRF & Session Security
CSRF_COOKIE_HTTPONLY = False  # Frontend JS needs to read csrftoken cookie
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_AGE = 86400 * 7  # 7 days
# SESSION_SAVE_EVERY_REQUEST = True => off: faqat o'zgarganda save qilinsin
SESSION_SAVE_EVERY_REQUEST = False
SESSION_COOKIE_NAME = 'edu_sid'   # Default 'sessionid' nomini yashirish
CSRF_COOKIE_NAME = 'edu_csrf'     # Default 'csrftoken' nomini yashirish

# Permissions-Policy header
PERMISSIONS_POLICY = {
    'camera': [],
    'microphone': [],
    'geolocation': [],
    'payment': [],
}

DATA_UPLOAD_MAX_MEMORY_SIZE = 104857600  # 100MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 524288000  # 500MB for videos


# File upload security
ALLOWED_UPLOAD_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.mp4', '.webm', '.ogg']
FILE_UPLOAD_PERMISSIONS = 0o644

# Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{levelname}] {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'WARNING',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'edushare.log',
            'formatter': 'verbose',
        },
        'security_file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'security.log',
            'formatter': 'verbose',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file', 'console'],
            'level': 'WARNING',
            'propagate': False,
        },
        'core.middleware': {
            'handlers': ['security_file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'core.signals': {
            'handlers': ['security_file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'axes': {
            'handlers': ['security_file', 'console'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
}

# Jazzmin Admin Configuration
JAZZMIN_SETTINGS = {
    "site_title": "EduShare Admin",
    "site_header": "EduShare",
    "site_brand": "EduShare Admin",
    # "site_logo": "static/img/logo.png",
    "login_logo": None,
    "login_logo_dark": None,
    "site_logo_classes": "img-circle",
    "site_icon": None,
    "welcome_sign": "EduShare boshqaruv paneliga xush kelibsiz!",
    "copyright": "EduShare.uz",
    "search_model": ["accounts.CustomUser"],
    "user_avatar": "avatar",

    "topmenu_links": [
        {"name": "Bosh sahifa", "url": "admin:index", "permissions": ["auth.view_user"]},
        {"name": "Saytga o'tish", "url": "http://edushare.uz", "new_window": True},
        {"model": "accounts.CustomUser"},
    ],

    "usermenu_links": [
        {"model": "accounts.CustomUser"},
    ],

    "show_sidebar": True,
    "navigation_expanded": True,
    "hide_apps": [],
    "hide_models": [],
    "order_with_respect_to": ["accounts", "courses", "core", "community"],

    "icons": {
        "auth": "fas fa-users-cog",
        "auth.user": "fas fa-user",
        "auth.Group": "fas fa-users",
        "accounts.CustomUser": "fas fa-user-graduate",
        "accounts.PasswordChangeOTP": "fas fa-key",
        "courses.Category": "fas fa-folder",
        "courses.SubCategory": "fas fa-folder-open",
        "courses.SubSubCategory": "fas fa-folder-tree",
        "courses.Lesson": "fas fa-play-circle",
        "courses.Certificate": "fas fa-certificate",
        "courses.LessonLike": "fas fa-heart",
        "courses.Submission": "fas fa-file-upload",
        "courses.Assignment": "fas fa-tasks",
        "courses.LessonQuizQuestion": "fas fa-question-circle",
        "core.Notification": "fas fa-bell",
        "core.IPBlocklist": "fas fa-user-slash",
        "core.AllowedIP": "fas fa-shield-alt",
        "core.UserActivityLog": "fas fa-history",
        "core.ChatViolation": "fas fa-exclamation-triangle",
        "core.ChatBotAccess": "fas fa-robot",
        "core.TeamMember": "fas fa-user-friends",
        "community.Article": "fas fa-newspaper",
        "community.BookReview": "fas fa-book",
        "community.Announcement": "fas fa-bullhorn",
        "sites.Site": "fas fa-globe",
        "socialaccount.SocialAccount": "fas fa-share-alt",
        "socialaccount.SocialToken": "fas fa-coins",
        "socialaccount.SocialApp": "fas fa-code",
    },
    "default_icon_parents": "fas fa-chevron-circle-right",
    "default_icon_children": "fas fa-circle",
    "related_modal_active": True,
    "custom_css": None,
    "custom_js": None,
    "show_ui_builder": False,
    "changeform_format": "horizontal_tabs",
    "changeform_format_overrides": {"auth.user": "collapsible", "auth.group": "vertical_tabs"},
}

JAZZMIN_UI_TWEAKS = {
    "navbar_small_text": False,
    "footer_small_text": False,
    "body_small_text": False,
    "brand_small_text": False,
    "brand_colour": "navbar-primary",
    "accent": "accent-primary",
    "navbar": "navbar-dark",
    "no_navbar_border": False,
    "navbar_fixed": True,
    "layout_boxed": False,
    "footer_fixed": False,
    "sidebar_fixed": True,
    "sidebar": "sidebar-dark-primary",
    "sidebar_nav_small_text": False,
    "sidebar_disable_expand": False,
    "sidebar_nav_child_indent": False,
    "sidebar_nav_compact_style": False,
    "sidebar_nav_legacy_style": False,
    "sidebar_nav_flat_style": False,
    "theme": "flatly",
    "dark_mode_theme": "darkly",
    "button_classes": {
        "primary": "btn-primary",
        "secondary": "btn-secondary",
        "info": "btn-info",
        "warning": "btn-warning",
        "danger": "btn-danger",
        "success": "btn-success"
    }
}

# Import advanced security settings
try:
    from .security_settings import *
except ImportError:
    pass