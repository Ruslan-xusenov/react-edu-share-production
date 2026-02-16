"""
Custom Validators - Security validation for models
"""
from django.core.exceptions import ValidationError
from django.utils.deconstruct import deconstructible
from .security_utils import validate_file_upload, sanitize_filename, sanitize_input
import os


@deconstructible
class FileSecurityValidator:
    """
    File upload security validator
    Backdoor prevention va malware detection
    """
    def __init__(self, allowed_extensions=None, max_size=5*1024*1024):
        self.allowed_extensions = allowed_extensions  # ['.jpg', '.png', ...]
        self.max_size = max_size  # bytes
    
    def __call__(self, file):
        # File size tekshiruvi
        if file.size > self.max_size:
            raise ValidationError(
                f'Fayl hajmi juda katta. Maksimal hajm: {self.max_size / (1024*1024):.1f} MB'
            )
        
        # File type tekshiruvi
        validate_file_upload(file.name, self.allowed_extensions)
        
        # Content-Type tekshiruvi
        if hasattr(file, 'content_type'):
            self._validate_content_type(file.content_type, file.name)
        
        return True
    
    def _validate_content_type(self, content_type, filename):
        """Content-Type va file extension mosligini tekshirish"""
        ext = os.path.splitext(filename.lower())[1]
        
        # Image files
        image_types = {
            '.jpg': ['image/jpeg', 'image/jpg'],
            '.jpeg': ['image/jpeg', 'image/jpg'],
            '.png': ['image/png'],
            '.gif': ['image/gif'],
            '.webp': ['image/webp'],
            '.svg': ['image/svg+xml'],
        }
        
        # Video files
        video_types = {
            '.mp4': ['video/mp4'],
            '.webm': ['video/webm'],
            '.ogg': ['video/ogg'],
        }
        
        # Document files
        doc_types = {
            '.pdf': ['application/pdf'],
            '.doc': ['application/msword'],
            '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        }
        
        all_types = {**image_types, **video_types, **doc_types}
        
        if ext in all_types:
            allowed_content_types = all_types[ext]
            if content_type not in allowed_content_types:
                raise ValidationError(
                    f'Fayl turi ({content_type}) va kengaytmasi ({ext}) mos kelmaydi.'
                )
    
    def __eq__(self, other):
        return (
            isinstance(other, FileSecurityValidator) and
            self.allowed_extensions == other.allowed_extensions and
            self.max_size == other.max_size
        )


@deconstructible
class TextSecurityValidator:
    """
    Text input security validator
    SQL Injection va XSS prevention
    """
    def __init__(self, max_length=5000, allow_html=False):
        self.max_length = max_length
        self.allow_html = allow_html
    
    def __call__(self, value):
        if not value:
            return True
        
        if len(value) > self.max_length:
            raise ValidationError(
                f'Matn juda uzun. Maksimal uzunlik: {self.max_length} belgi'
            )
        
        # SQL Injection va XSS tekshiruvi
        try:
            sanitized = sanitize_input(value)
            # Agar sanitize qilingan qiymat asl qiymatdan juda farq qilsa
            if len(sanitized) < len(value) * 0.5:  # 50% dan ko'p o'zgargan
                raise ValidationError(
                    'Xavfli belgilar topildi. Iltimos, to\'g\'ri matn kiriting.'
                )
        except ValidationError as e:
            raise e
        
        return True
    
    def __eq__(self, other):
        return (
            isinstance(other, TextSecurityValidator) and
            self.max_length == other.max_length and
            self.allow_html == other.allow_html
        )


@deconstructible
class URLSecurityValidator:
    """
    URL security validator
    SSRF va Open Redirect prevention
    """
    def __call__(self, value):
        from .security_utils import validate_url
        
        if not value:
            return True
        
        try:
            validate_url(value)
        except ValidationError as e:
            raise e
        
        return True
    
    def __eq__(self, other):
        return isinstance(other, URLSecurityValidator)
