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
