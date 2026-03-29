from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=200)
    school = models.CharField(max_length=200, blank=True, null=True)
    grade = models.CharField(max_length=50, blank=True, null=True, help_text="e.g., 9, 10, 11")
    interests = models.TextField(blank=True, null=True, help_text="Areas of interest, comma-separated")
    points = models.IntegerField(default=0, help_text="Gamification points for contributions")
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    is_volunteer = models.BooleanField(default=False, help_text="Volunteer team member")
    region = models.CharField(max_length=100, blank=True, null=True, help_text="User's home region")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'full_name']
    
    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-points', '-created_at']
    
    def __str__(self):
        return f"{self.full_name} ({self.email})"
    
    def get_completed_courses_count(self):
        from courses.models import Certificate
        return Certificate.objects.filter(user=self).count()
    
    def get_created_lessons_count(self):
        return self.lessons_created.count()


class PasswordChangeOTP(models.Model):
    """
    Email orqali parol almashtirish uchun OTP (bir martalik kod).
    Foydalanuvchi yangi parol kiritadi → OTP emailga yuboriladi →
    OTP tasdiqlanadi → parol o'zgartiriladi.
    """
    user = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.CASCADE,
        related_name='password_otp_requests'
    )
    # 6-raqamli OTP kodi
    code = models.CharField(max_length=6)
    # Yangi parol (hashed) — OTP tasdiqlangandan keyin o'rnatiladi
    new_password_hash = models.CharField(max_length=255)
    # 30 daqiqa ichida muddati tugaydi
    expires_at = models.DateTimeField()
    # Faqat bir marta ishlatilishi mumkin
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    # Noto'g'ri urinishlar soni (max 5)
    attempts = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Parol OTP'
        verbose_name_plural = 'Parol OTPlar'
        indexes = [
            models.Index(fields=['user', 'is_used'], name='otp_user_used_idx'),
        ]

    def __str__(self):
        return f"{self.user.email} — OTP ({self.created_at.strftime('%H:%M')})"

    def is_valid(self):
        from django.utils import timezone
        return (
            not self.is_used
            and self.expires_at > timezone.now()
            and self.attempts < 5
        )