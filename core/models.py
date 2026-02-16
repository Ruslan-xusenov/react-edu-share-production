from django.db import models
from django.conf import settings
from django.utils import timezone

class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('comment', 'New Comment'),
        ('submission', 'New Submission'),
        ('grade', 'Assignment Graded'),
        ('system', 'System Message'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    link = models.CharField(max_length=255, blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.title}"


class UserActivityLog(models.Model):
    ACTIVITY_TYPES = [
        ('login', 'Tizimga kirish'),
        ('logout', 'Tizimdan chiqish'),
        ('registration', 'Registratsiya'),
        ('failed_login', 'Muvaffaqiyatsiz kirish'),
        ('password_change', 'Parol o\'zgartirish'),
        ('profile_update', 'Profil yangilash'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='activity_logs'
    )
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPES)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)  # Browser va qurilma ma'lumotlari
    device_type = models.CharField(max_length=50, null=True, blank=True)  # mobile, desktop, tablet
    browser = models.CharField(max_length=100, null=True, blank=True)
    os = models.CharField(max_length=100, null=True, blank=True)
    country = models.CharField(max_length=100, null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)
    success = models.BooleanField(default=True)
    error_message = models.TextField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['ip_address']),
            models.Index(fields=['user', '-timestamp']),
        ]
    
    def __str__(self):
        user_info = self.user.email if self.user else self.ip_address
        return f"{user_info} - {self.get_activity_type_display()} - {self.timestamp}"


class IPBlocklist(models.Model):
    BLOCK_REASONS = [
        ('ddos', 'DDoS hujum'),
        ('brute_force', 'Brute force hujum'),
        ('spam', 'Spam'),
        ('manual', 'Qo\'lda bloklangan'),
        ('suspicious', 'Shubhali faollik'),
    ]
    
    ip_address = models.GenericIPAddressField(unique=True)
    reason = models.CharField(max_length=20, choices=BLOCK_REASONS)
    description = models.TextField(null=True, blank=True)
    blocked_at = models.DateTimeField(auto_now_add=True)
    blocked_until = models.DateTimeField(null=True, blank=True)  # Vaqtinchalik blok uchun
    is_permanent = models.BooleanField(default=False)
    attempt_count = models.IntegerField(default=0)
    last_attempt = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-blocked_at']
        verbose_name = 'IP Bloklash'
        verbose_name_plural = 'IP Bloklashlar'
    
    def __str__(self):
        return f"{self.ip_address} - {self.get_reason_display()}"
    
    def is_active(self):
        if self.is_permanent:
            return True
        if self.blocked_until and self.blocked_until > timezone.now():
            return True
        return False
