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
    user_agent = models.TextField(null=True, blank=True)
    device_type = models.CharField(max_length=50, null=True, blank=True)
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
    blocked_until = models.DateTimeField(null=True, blank=True)
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


class ChatViolation(models.Model):
    VIOLATION_TYPES = [
        ('harmful', 'Zararli kontent so\'rovi'),
        ('violence', 'Zo\'ravonlik'),
        ('adult', 'Kattalar uchun kontent'),
        ('hacking', 'Hacking/Exploit'),
        ('spam', 'Spam'),
        ('off_topic', 'Mavzuga mos emas'),
        ('harassment', 'Haqorat/Diskriminatsiya'),
        ('other', 'Boshqa'),
    ]

    SEVERITY_LEVELS = [
        ('low', 'Past'),
        ('medium', 'O\'rta'),
        ('high', 'Yuqori'),
        ('critical', 'Kritik'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='chat_violations'
    )
    user_email = models.EmailField(help_text="So'rov yuborgan foydalanuvchi emaili")
    user_message = models.TextField(help_text="Foydalanuvchi yuborgan xabar")
    ai_response = models.TextField(help_text="AI bergan javob", blank=True, default='')
    violation_type = models.CharField(max_length=20, choices=VIOLATION_TYPES, default='other')
    severity = models.CharField(max_length=10, choices=SEVERITY_LEVELS, default='medium')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    is_reviewed = models.BooleanField(default=False, help_text="Admin ko'rib chiqdimi?")
    admin_notes = models.TextField(blank=True, default='', help_text="Admin eslatmalari")
    action_taken = models.CharField(
        max_length=50, blank=True, default='',
        help_text="Qanday chora ko'rildi (bloklash, ogohlantirish va h.k.)"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Chat Qoidabuzarlik'
        verbose_name_plural = 'Chat Qoidabuzarliklar'
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['user']),
            models.Index(fields=['is_reviewed']),
            models.Index(fields=['violation_type']),
        ]

    def __str__(self):
        return f"{self.user_email} - {self.get_violation_type_display()} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"


class ChatBotAccess(models.Model):
    BLOCK_TYPES = [
        ('none', 'Bloklanmagan'),
        ('temporary', 'Vaqtinchalik bloklangan'),
        ('permanent', 'Doimiy bloklangan'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chatbot_access'
    )
    block_type = models.CharField(max_length=20, choices=BLOCK_TYPES, default='none')
    blocked_until = models.DateTimeField(null=True, blank=True, help_text="Vaqtinchalik blok uchun")
    block_reason = models.TextField(blank=True, default='', help_text="Bloklash sababi")
    blocked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='chatbot_blocks_made',
        help_text="Bloklagan admin"
    )
    violation_count = models.IntegerField(default=0, help_text="Umumiy qoidabuzarlik soni")
    last_violation_at = models.DateTimeField(null=True, blank=True)
    email_notification_sent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'ChatBot Huquqi'
        verbose_name_plural = 'ChatBot Huquqlari'

    def __str__(self):
        return f"{self.user.email} - {self.get_block_type_display()}"

    def is_blocked(self):
        if self.block_type == 'permanent':
            return True
        if self.block_type == 'temporary' and self.blocked_until:
            if self.blocked_until > timezone.now():
                return True
            self.block_type = 'none'
            self.blocked_until = None
            self.save(update_fields=['block_type', 'blocked_until'])
            return False
        return False

    def get_remaining_time(self):
        if self.block_type == 'temporary' and self.blocked_until:
            remaining = self.blocked_until - timezone.now()
            if remaining.total_seconds() > 0:
                hours = int(remaining.total_seconds() // 3600)
                minutes = int((remaining.total_seconds() % 3600) // 60)
                return f"{hours} soat {minutes} daqiqa"
        return None
