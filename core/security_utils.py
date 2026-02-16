import re
import bleach
from django.utils.html import escape
from django.core.exceptions import ValidationError


SQL_INJECTION_PATTERNS = [
    r"(\bunion\b.*\bselect\b)",
    r"(\bselect\b.*\bfrom\b)",
    r"(\binsert\b.*\binto\b)",
    r"(\bupdate\b.*\bset\b)",
    r"(\bdelete\b.*\bfrom\b)",
    r"(\bdrop\b.*\btable\b)",
    r"(\bexec\b|\bexecute\b)",
    r"(\bor\b.*=.*)",
    r"(\band\b.*=.*)",
    r"(--|#|/\*|\*/)",
    r"(\bxp_cmdshell\b)",
    r"(\bsp_executesql\b)",
    r"(\bshutdown\b)",
]

XSS_PATTERNS = [
    r"<script[^>]*>.*?</script>",
    r"javascript:",
    r"onerror\s*=",
    r"onload\s*=",
    r"onclick\s*=",
    r"<iframe[^>]*>",
    r"<object[^>]*>",
    r"<embed[^>]*>",
    r"eval\s*\(",
    r"expression\s*\(",
]

DANGEROUS_EXTENSIONS = [
    '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js',
    '.jar', '.app', '.sh', '.bash', '.zsh', '.ps1', '.py', '.rb',
    '.php', '.asp', '.aspx', '.jsp', '.cgi', '.pl'
]

ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.avi', '.mov']
ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.md']


def sanitize_input(text):
    if not text or not isinstance(text, str):
        return text
    
    cleaned = bleach.clean(
        text,
        tags=[],
        attributes={},
        strip=True
    )
    
    text_lower = cleaned.lower()
    for pattern in SQL_INJECTION_PATTERNS:
        if re.search(pattern, text_lower, re.IGNORECASE):
            raise ValidationError(
                "Xavfli belgilar topildi. Iltimos, to'g'ri ma'lumot kiriting."
            )
    
    return cleaned


def sanitize_html_output(text, allowed_tags=None):
    if not text or not isinstance(text, str):
        return text
    
    if allowed_tags is None:
        allowed_tags = ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li']
    
    allowed_attrs = {
        'a': ['href', 'title'],
        '*': ['class']
    }
    
    return bleach.clean(
        text,
        tags=allowed_tags,
        attributes=allowed_attrs,
        strip=True
    )


def check_sql_injection(query_string):
    if not query_string:
        return False
    
    query_lower = query_string.lower()
    for pattern in SQL_INJECTION_PATTERNS:
        if re.search(pattern, query_lower, re.IGNORECASE):
            return True
    
    return False


def check_xss_attack(input_string):
    if not input_string:
        return False
    
    for pattern in XSS_PATTERNS:
        if re.search(pattern, input_string, re.IGNORECASE):
            return True
    
    return False


def validate_file_upload(filename, allowed_extensions=None):
    import os
    
    if not filename:
        raise ValidationError("Fayl nomi bo'sh bo'lishi mumkin emas.")
    
    filename = os.path.basename(filename)
    
    _, ext = os.path.splitext(filename.lower())
    
    if ext in DANGEROUS_EXTENSIONS:
        raise ValidationError(
            f"Bu turdagi fayllar ({ext}) xavfsizlik sabablariga ko'ra yuklanishi mumkin emas."
        )
    
    if allowed_extensions:
        if ext not in allowed_extensions:
            raise ValidationError(
                f"Faqat quyidagi formatdagi fayllar ruxsat etilgan: {', '.join(allowed_extensions)}"
            )
    parts = filename.split('.')
    if len(parts) > 2:
        for part in parts[:-1]:
            if f'.{part.lower()}' in DANGEROUS_EXTENSIONS:
                raise ValidationError(
                    "Xavfli fayl formati topildi."
                )
    
    if '\x00' in filename:
        raise ValidationError("Noto'g'ri fayl nomi.")
    
    return True


def sanitize_filename(filename):
    import os
    import unicodedata
    
    filename = os.path.basename(filename)
    
    filename = unicodedata.normalize('NFKD', filename)
    
    filename = re.sub(r'[^\w\s.-]', '', filename)
    
    filename = re.sub(r'\.+', '.', filename)
    
    filename = re.sub(r'\s+', '_', filename)
    
    if len(filename) > 255:
        name, ext = os.path.splitext(filename)
        filename = name[:255-len(ext)] + ext
    
    return filename


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    
    if ip and _is_valid_ip(ip):
        return ip
    return '0.0.0.0'


def _is_valid_ip(ip):
    import ipaddress
    try:
        ipaddress.ip_address(ip)
        return True
    except ValueError:
        return False


def check_path_traversal(path):
    if not path:
        return False
    
    dangerous_patterns = [
        r'\.\.',
        r'~',
        r'/etc/', r'/var/', r'/usr/', r'/bin/', r'/sbin/',
    ]
    
    for pattern in dangerous_patterns:
        if re.search(pattern, path):
            return True
    
    return False


def validate_url(url):
    if not url:
        return True
    
    if not url.startswith(('http://', 'https://')):
        raise ValidationError(
            "Faqat HTTP yoki HTTPS URL larga ruxsat etilgan."
        )
    
    dangerous_protocols = [
        'file://', 'ftp://', 'javascript:', 'data:', 
        'vbscript:', 'ssh://', 'telnet://'
    ]
    
    for protocol in dangerous_protocols:
        if url.lower().startswith(protocol):
            raise ValidationError("Xavfli URL protokoli topildi.")
    
    local_patterns = [
        r'localhost', r'127\.0\.0\.1', r'0\.0\.0\.0',
        r'192\.168\.', r'10\.', r'172\.(1[6-9]|2[0-9]|3[0-1])\.',
        r'\[::1\]', r'\[::ffff:127\.0\.0\.1\]'
    ]
    
    for pattern in local_patterns:
        if re.search(pattern, url.lower()):
            raise ValidationError(
                "Local serverga so'rov yuborish man etilgan."
            )
    
    return True


def rate_limit_key(request):
    ip = get_client_ip(request)
    user_agent = request.META.get('HTTP_USER_AGENT', '')[:50]
    
    return f"{ip}_{hash(user_agent)}"


def check_brute_force(identifier, max_attempts=5, window=300):
    from django.core.cache import cache
    
    cache_key = f'brute_force_{identifier}'
    attempts = cache.get(cache_key, 0)
    
    if attempts >= max_attempts:
        return False
    
    cache.set(cache_key, attempts + 1, window)
    return True


def log_security_event(event_type, details, severity='WARNING'):
    import logging
    
    logger = logging.getLogger('core.security')
    
    log_message = f"[SECURITY] {event_type}: {details}"
    
    if severity == 'CRITICAL':
        logger.critical(log_message)
    elif severity == 'ERROR':
        logger.error(log_message)
    elif severity == 'WARNING':
        logger.warning(log_message)
    else:
        logger.info(log_message)