from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ['email', 'full_name', 'school', 'grade', 'points', 'created_at']
    list_filter = ['school', 'grade', 'created_at']
    search_fields = ['email', 'full_name', 'school']
    ordering = ['-points', '-created_at']
    
    fieldsets = UserAdmin.fieldsets + (
        ('Additional Info', {
            'fields': ('full_name', 'school', 'grade', 'interests', 'points', 'avatar', 'bio')
        }),
    )
    
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Additional Info', {
            'fields': ('email', 'full_name', 'school', 'grade', 'interests', 'points', 'avatar', 'bio')
        }),
    )
