from django.contrib import admin
from django.utils.html import format_html
from .models import Notification, UserActivityLog, IPBlocklist


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'notification_type', 'title', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read', 'created_at']
    search_fields = ['user__email', 'title', 'message']
    readonly_fields = ['created_at']


@admin.register(UserActivityLog)
class UserActivityLogAdmin(admin.ModelAdmin):
    list_display = ['user_link', 'activity_type', 'ip_address', 'device_info', 'location', 'success', 'timestamp']
    list_filter = ['activity_type', 'success', 'device_type', 'timestamp', 'country']
    search_fields = ['user__email', 'ip_address', 'browser', 'os']
    readonly_fields = ['user', 'activity_type', 'ip_address', 'user_agent', 'device_type', 
                       'browser', 'os', 'country', 'city', 'success', 'error_message', 'timestamp']
    date_hierarchy = 'timestamp'
    
    def user_link(self, obj):
        if obj.user:
            return format_html('<a href="/admin/accounts/customuser/{}/change/">{}</a>', 
                             obj.user.id, obj.user.email)
        return '-'
    user_link.short_description = 'Foydalanuvchi'
    
    def device_info(self, obj):
        return f"{obj.device_type or '-'} | {obj.browser or '-'}"
    device_info.short_description = 'Qurilma'
    
    def location(self, obj):
        if obj.country or obj.city:
            return f"{obj.city or ''}, {obj.country or ''}".strip(', ')
        return '-'
    location.short_description = 'Joylashuv'
    
    def has_add_permission(self, request):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(IPBlocklist)
class IPBlocklistAdmin(admin.ModelAdmin):
    list_display = ['ip_address', 'reason', 'status_badge', 'attempt_count', 'blocked_at', 'blocked_until']
    list_filter = ['reason', 'is_permanent', 'blocked_at']
    search_fields = ['ip_address', 'description']
    readonly_fields = ['blocked_at', 'last_attempt']
    fieldsets = (
        ('IP Ma\'lumotlari', {
            'fields': ('ip_address', 'reason', 'description')
        }),
        ('Blok sozlamalari', {
            'fields': ('is_permanent', 'blocked_until', 'attempt_count', 'last_attempt')
        }),
        ('Vaqt ma\'lumotlari', {
            'fields': ('blocked_at',)
        }),
    )
    
    def status_badge(self, obj):
        if obj.is_active():
            return format_html(
                '<span style="background-color: #dc3545; color: white; padding: 3px 10px; '
                'border-radius: 3px; font-weight: bold;">🔒 Bloklangan</span>'
            )
        return format_html(
            '<span style="background-color: #28a745; color: white; padding: 3px 10px; '
            'border-radius: 3px; font-weight: bold;">✅ Faol emas</span>'
        )
    status_badge.short_description = 'Holat'
    
    actions = ['make_permanent', 'unblock_ips']
    
    def make_permanent(self, request, queryset):
        queryset.update(is_permanent=True, blocked_until=None)
        self.message_user(request, f"{queryset.count()} ta IP doimiy bloklandi.")
    make_permanent.short_description = "Doimiy bloklash"
    
    def unblock_ips(self, request, queryset):
        count = queryset.count()
        queryset.delete()
        self.message_user(request, f"{count} ta IP blokdan olib tashlandi.")
    unblock_ips.short_description = "Blokdan chiqarish"