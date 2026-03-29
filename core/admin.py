from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from datetime import timedelta
from .models import Notification, UserActivityLog, IPBlocklist, ChatViolation, ChatBotAccess, TeamMember, AllowedIP


@admin.register(AllowedIP)
class AllowedIPAdmin(admin.ModelAdmin):
    list_display = ['ip_address', 'description', 'is_active', 'status_badge', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['ip_address', 'description']
    list_editable = ['is_active']
    
    def status_badge(self, obj):
        if obj.is_active:
            return format_html(
                '<span style="background-color: #28a745; color: white; padding: 3px 10px; '
                'border-radius: 3px; font-weight: bold;">✅ Ruxsat berilgan</span>'
            )
        return format_html(
            '<span style="background-color: #6c757d; color: white; padding: 3px 10px; '
            'border-radius: 3px; font-weight: bold;">❌ Taqiqlangan</span>'
        )
    status_badge.short_description = 'Holat'


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


def _is_google_user(user):
    try:
        from allauth.socialaccount.models import SocialAccount
        return SocialAccount.objects.filter(user=user, provider='google').exists()
    except Exception:
        return False


def _send_block_notification(user, block_type, reason, blocked_until=None):
    if not _is_google_user(user):
        return False

    if block_type == 'permanent':
        subject = '🚫 EduShare ChatBot - Doimiy bloklash'
        message = (
            f"Hurmatli {user.full_name},\n\n"
            f"Sizning EduShare ChatBot'dan foydalanish huquqingiz DOIMIY ravishda bloklandi.\n\n"
            f"📋 Sabab: {reason}\n\n"
            f"⚠️ Bu qaror chat qoidalarini buzganingiz sababli qabul qilindi.\n"
            f"Agar bu xatolik deb hisoblasangiz, admin bilan bog'laning.\n\n"
            f"Hurmat bilan,\n"
            f"EduShare Jamoasi"
        )
    elif block_type == 'temporary':
        until_str = blocked_until.strftime('%Y-%m-%d %H:%M') if blocked_until else 'noma\'lum'
        subject = '⏳ EduShare ChatBot - Vaqtinchalik bloklash'
        message = (
            f"Hurmatli {user.full_name},\n\n"
            f"Sizning EduShare ChatBot'dan foydalanish huquqingiz VAQTINCHALIK bloklandi.\n\n"
            f"📋 Sabab: {reason}\n"
            f"⏰ Blok tugash vaqti: {until_str}\n\n"
            f"⚠️ Bu qaror chat qoidalarini buzganingiz sababli qabul qilindi.\n"
            f"Blok muddati tugagach, chatbot'dan qaytadan foydalanishingiz mumkin.\n\n"
            f"Hurmat bilan,\n"
            f"EduShare Jamoasi"
        )
    elif block_type == 'unblock':
        subject = '✅ EduShare ChatBot - Blokdan chiqarildi'
        message = (
            f"Hurmatli {user.full_name},\n\n"
            f"Sizning EduShare ChatBot'dan foydalanish huquqingiz qaytadan tiklandi! 🎉\n\n"
            f"📋 Izoh: {reason}\n\n"
            f"Endi chatbot'dan erkin foydalanishingiz mumkin.\n"
            f"Iltimos, chat qoidalariga rioya qiling.\n\n"
            f"Hurmat bilan,\n"
            f"EduShare Jamoasi"
        )
    else:
        return False

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )
        return True
    except Exception:
        return False


@admin.register(ChatViolation)
class ChatViolationAdmin(admin.ModelAdmin):
    list_display = [
        'user_link', 'violation_badge', 'severity_badge',
        'short_message', 'review_status', 'action_taken', 'created_at'
    ]
    list_filter = ['violation_type', 'severity', 'is_reviewed', 'created_at']
    search_fields = ['user_email', 'user_message', 'ai_response', 'admin_notes']
    readonly_fields = [
        'user', 'user_email', 'user_message', 'ai_response',
        'violation_type', 'severity', 'ip_address', 'user_agent', 'created_at'
    ]
    date_hierarchy = 'created_at'
    list_per_page = 25

    fieldsets = (
        ('👤 Foydalanuvchi ma\'lumotlari', {
            'fields': ('user', 'user_email', 'ip_address', 'user_agent')
        }),
        ('💬 Xabar tafsilotlari', {
            'fields': ('user_message', 'ai_response', 'violation_type', 'severity'),
            'classes': ('wide',),
        }),
        ('🔧 Admin boshqaruvi', {
            'fields': ('is_reviewed', 'admin_notes', 'action_taken'),
        }),
        ('📅 Vaqt', {
            'fields': ('created_at',),
        }),
    )

    def user_link(self, obj):
        if obj.user:
            return format_html(
                '<a href="/admin/accounts/customuser/{}/change/" style="font-weight:bold;">{}</a>',
                obj.user.id, obj.user_email
            )
        return format_html('<span style="color:#999;">{}</span>', obj.user_email)
    user_link.short_description = 'Foydalanuvchi'

    def violation_badge(self, obj):
        colors = {
            'harmful': '#dc3545',
            'violence': '#ff4444',
            'adult': '#e91e63',
            'hacking': '#ff5722',
            'spam': '#ff9800',
            'off_topic': '#607d8b',
            'harassment': '#9c27b0',
            'other': '#795548',
        }
        color = colors.get(obj.violation_type, '#607d8b')
        return format_html(
            '<span style="background-color:{}; color:white; padding:2px 8px; '
            'border-radius:12px; font-size:11px; font-weight:bold;">{}</span>',
            color, obj.get_violation_type_display()
        )
    violation_badge.short_description = 'Tur'

    def severity_badge(self, obj):
        icons = {'low': '🟢', 'medium': '🟡', 'high': '🟠', 'critical': '🔴'}
        return format_html(
            '{} {}', icons.get(obj.severity, '⚪'), obj.get_severity_display()
        )
    severity_badge.short_description = 'Darajasi'

    def short_message(self, obj):
        msg = obj.user_message[:80] + '...' if len(obj.user_message) > 80 else obj.user_message
        return format_html('<span title="{}">{}</span>', obj.user_message, msg)
    short_message.short_description = 'Xabar'

    def review_status(self, obj):
        if obj.is_reviewed:
            return format_html(
                '<span style="background:#28a745; color:white; padding:2px 8px; '
                'border-radius:3px;">✅ Ko\'rilgan</span>'
            )
        return format_html(
            '<span style="background:#ffc107; color:black; padding:2px 8px; '
            'border-radius:3px;">⏳ Kutilmoqda</span>'
        )
    review_status.short_description = 'Holati'

    actions = [
        'mark_reviewed', 'block_user_permanent',
        'block_user_24h', 'block_user_7d', 'block_user_30d',
        'unblock_user', 'send_warning_email'
    ]

    def mark_reviewed(self, request, queryset):
        queryset.update(is_reviewed=True)
        self.message_user(request, f"{queryset.count()} ta qoidabuzarlik ko'rilgan deb belgilandi.")
    mark_reviewed.short_description = "✅ Ko'rilgan deb belgilash"

    def _block_user_chatbot(self, request, queryset, block_type, duration=None, duration_text=''):
        blocked_count = 0
        email_sent_count = 0

        for violation in queryset:
            if not violation.user:
                continue

            blocked_until = timezone.now() + duration if duration else None
            reason = f"Chat qoidabuzarlik: {violation.get_violation_type_display()}"

            access, created = ChatBotAccess.objects.get_or_create(
                user=violation.user,
                defaults={
                    'block_type': block_type,
                    'blocked_until': blocked_until,
                    'block_reason': reason,
                    'blocked_by': request.user,
                    'violation_count': 1,
                    'last_violation_at': timezone.now(),
                }
            )
            if not created:
                access.block_type = block_type
                access.blocked_until = blocked_until
                access.block_reason = reason
                access.blocked_by = request.user
                access.violation_count += 1
                access.last_violation_at = timezone.now()
                access.email_notification_sent = False
                access.save()

            violation.is_reviewed = True
            action_text = f"{'Doimiy' if block_type == 'permanent' else duration_text} bloklandi"
            violation.action_taken = action_text
            violation.save()

            email_result = _send_block_notification(
                violation.user, block_type, reason, blocked_until
            )
            if email_result:
                access.email_notification_sent = True
                access.save(update_fields=['email_notification_sent'])
                email_sent_count += 1

            blocked_count += 1

        msg = f"{blocked_count} ta foydalanuvchi chatbot'dan bloklandi."
        if email_sent_count > 0:
            msg += f" {email_sent_count} ta foydalanuvchiga email yuborildi."
        self.message_user(request, msg)

    def block_user_permanent(self, request, queryset):
        self._block_user_chatbot(request, queryset, 'permanent')
    block_user_permanent.short_description = "🚫 Doimiy bloklash (chatbot)"

    def block_user_24h(self, request, queryset):
        self._block_user_chatbot(request, queryset, 'temporary', timedelta(hours=24), '24 soat')
    block_user_24h.short_description = "⏳ 24 soatga bloklash (chatbot)"

    def block_user_7d(self, request, queryset):
        self._block_user_chatbot(request, queryset, 'temporary', timedelta(days=7), '7 kun')
    block_user_7d.short_description = "⏳ 7 kunga bloklash (chatbot)"

    def block_user_30d(self, request, queryset):
        self._block_user_chatbot(request, queryset, 'temporary', timedelta(days=30), '30 kun')
    block_user_30d.short_description = "⏳ 30 kunga bloklash (chatbot)"

    def unblock_user(self, request, queryset):
        unblocked = 0
        email_sent = 0
        for violation in queryset:
            if not violation.user:
                continue
            try:
                access = ChatBotAccess.objects.get(user=violation.user)
                access.block_type = 'none'
                access.blocked_until = None
                access.email_notification_sent = False
                access.save()

                email_result = _send_block_notification(
                    violation.user, 'unblock', 'Admin tomonidan blokdan chiqarildi'
                )
                if email_result:
                    access.email_notification_sent = True
                    access.save(update_fields=['email_notification_sent'])
                    email_sent += 1

                unblocked += 1
            except ChatBotAccess.DoesNotExist:
                pass

        msg = f"{unblocked} ta foydalanuvchi blokdan chiqarildi."
        if email_sent > 0:
            msg += f" {email_sent} ta foydalanuvchiga email yuborildi."
        self.message_user(request, msg)
    unblock_user.short_description = "✅ Blokdan chiqarish (chatbot)"

    def send_warning_email(self, request, queryset):
        sent = 0
        for violation in queryset:
            if not violation.user or not _is_google_user(violation.user):
                continue
            try:
                send_mail(
                    subject='⚠️ EduShare ChatBot - Ogohlantirish',
                    message=(
                        f"Hurmatli {violation.user.full_name},\n\n"
                        f"Sizning chatbot'dagi so'rovingiz qoidalarga mos kelmadi.\n\n"
                        f"📋 So'rovingiz: {violation.user_message[:200]}\n"
                        f"📌 Tur: {violation.get_violation_type_display()}\n\n"
                        f"⚠️ Bu ogohlantirish. Davomiy buzilishlar chatbot'dan bloklashga olib kelishi mumkin.\n\n"
                        f"Hurmat bilan,\n"
                        f"EduShare Jamoasi"
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[violation.user.email],
                    fail_silently=True,
                )
                violation.action_taken = 'Ogohlantirish emaili yuborildi'
                violation.is_reviewed = True
                violation.save()
                sent += 1
            except Exception:
                pass
        self.message_user(request, f"{sent} ta foydalanuvchiga ogohlantirish emaili yuborildi.")
    send_warning_email.short_description = "📧 Ogohlantirish emaili yuborish"


@admin.register(ChatBotAccess)
class ChatBotAccessAdmin(admin.ModelAdmin):
    list_display = [
        'user_link', 'block_status', 'block_reason_short',
        'violation_count', 'blocked_by_link', 'email_badge',
        'remaining_time', 'updated_at'
    ]
    list_filter = ['block_type', 'email_notification_sent', 'updated_at']
    search_fields = ['user__email', 'user__full_name', 'block_reason']
    readonly_fields = ['created_at', 'updated_at', 'violation_count', 'last_violation_at']
    list_per_page = 25

    fieldsets = (
        ('👤 Foydalanuvchi', {
            'fields': ('user',)
        }),
        ('🔒 Blok sozlamalari', {
            'fields': ('block_type', 'blocked_until', 'block_reason', 'blocked_by')
        }),
        ('📊 Statistika', {
            'fields': ('violation_count', 'last_violation_at', 'email_notification_sent')
        }),
        ('📅 Vaqt', {
            'fields': ('created_at', 'updated_at')
        }),
    )

    def user_link(self, obj):
        return format_html(
            '<a href="/admin/accounts/customuser/{}/change/" style="font-weight:bold;">{}</a>',
            obj.user.id, obj.user.email
        )
    user_link.short_description = 'Foydalanuvchi'

    def block_status(self, obj):
        if obj.is_blocked():
            if obj.block_type == 'permanent':
                return format_html(
                    '<span style="background:#dc3545; color:white; padding:3px 10px; '
                    'border-radius:3px; font-weight:bold;">🚫 Doimiy blok</span>'
                )
            return format_html(
                '<span style="background:#ff9800; color:white; padding:3px 10px; '
                'border-radius:3px; font-weight:bold;">⏳ Vaqtinchalik blok</span>'
            )
        return format_html(
            '<span style="background:#28a745; color:white; padding:3px 10px; '
            'border-radius:3px; font-weight:bold;">✅ Faol</span>'
        )
    block_status.short_description = 'Holat'

    def block_reason_short(self, obj):
        if obj.block_reason:
            short = obj.block_reason[:50] + '...' if len(obj.block_reason) > 50 else obj.block_reason
            return format_html('<span title="{}">{}</span>', obj.block_reason, short)
        return '-'
    block_reason_short.short_description = 'Sabab'

    def blocked_by_link(self, obj):
        if obj.blocked_by:
            return format_html(
                '<a href="/admin/accounts/customuser/{}/change/">{}</a>',
                obj.blocked_by.id, obj.blocked_by.email
            )
        return '-'
    blocked_by_link.short_description = 'Bloklagan'

    def email_badge(self, obj):
        if obj.email_notification_sent:
            return format_html('<span style="color:#28a745;">📧 Yuborildi</span>')
        return format_html('<span style="color:#999;">📧 Yuborilmadi</span>')
    email_badge.short_description = 'Email'

    def remaining_time(self, obj):
        remaining = obj.get_remaining_time()
        if remaining:
            return format_html('<span style="color:#ff9800; font-weight:bold;">⏰ {}</span>', remaining)
        if obj.block_type == 'permanent':
            return format_html('<span style="color:#dc3545;">♾️ Cheksiz</span>')
        return '-'
    remaining_time.short_description = 'Qolgan vaqt'

    actions = ['block_permanent', 'block_24h', 'block_7d', 'unblock_users']

    def block_permanent(self, request, queryset):
        email_sent = 0
        for access in queryset:
            access.block_type = 'permanent'
            access.blocked_until = None
            access.block_reason = 'Admin tomonidan doimiy bloklandi'
            access.blocked_by = request.user
            access.email_notification_sent = False
            access.save()

            if _send_block_notification(access.user, 'permanent', access.block_reason):
                access.email_notification_sent = True
                access.save(update_fields=['email_notification_sent'])
                email_sent += 1

        msg = f"{queryset.count()} ta foydalanuvchi doimiy bloklandi."
        if email_sent > 0:
            msg += f" {email_sent} ta foydalanuvchiga email yuborildi."
        self.message_user(request, msg)
    block_permanent.short_description = "🚫 Doimiy bloklash"

    def block_24h(self, request, queryset):
        blocked_until = timezone.now() + timedelta(hours=24)
        email_sent = 0
        for access in queryset:
            access.block_type = 'temporary'
            access.blocked_until = blocked_until
            access.block_reason = 'Admin tomonidan 24 soatga bloklandi'
            access.blocked_by = request.user
            access.email_notification_sent = False
            access.save()

            if _send_block_notification(access.user, 'temporary', access.block_reason, blocked_until):
                access.email_notification_sent = True
                access.save(update_fields=['email_notification_sent'])
                email_sent += 1

        msg = f"{queryset.count()} ta foydalanuvchi 24 soatga bloklandi."
        if email_sent > 0:
            msg += f" {email_sent} ta foydalanuvchiga email yuborildi."
        self.message_user(request, msg)
    block_24h.short_description = "⏳ 24 soatga bloklash"

    def block_7d(self, request, queryset):
        blocked_until = timezone.now() + timedelta(days=7)
        email_sent = 0
        for access in queryset:
            access.block_type = 'temporary'
            access.blocked_until = blocked_until
            access.block_reason = 'Admin tomonidan 7 kunga bloklandi'
            access.blocked_by = request.user
            access.email_notification_sent = False
            access.save()

            if _send_block_notification(access.user, 'temporary', access.block_reason, blocked_until):
                access.email_notification_sent = True
                access.save(update_fields=['email_notification_sent'])
                email_sent += 1

        msg = f"{queryset.count()} ta foydalanuvchi 7 kunga bloklandi."
        if email_sent > 0:
            msg += f" {email_sent} ta foydalanuvchiga email yuborildi."
        self.message_user(request, msg)
    block_7d.short_description = "⏳ 7 kunga bloklash"

    def unblock_users(self, request, queryset):
        email_sent = 0
        for access in queryset:
            access.block_type = 'none'
            access.blocked_until = None
            access.block_reason = 'Admin tomonidan blokdan chiqarildi'
            access.email_notification_sent = False
            access.save()

            if _send_block_notification(access.user, 'unblock', 'Admin tomonidan blokdan chiqarildi'):
                access.email_notification_sent = True
                access.save(update_fields=['email_notification_sent'])
                email_sent += 1

        msg = f"{queryset.count()} ta foydalanuvchi blokdan chiqarildi."
        if email_sent > 0:
            msg += f" {email_sent} ta foydalanuvchiga email yuborildi."
        self.message_user(request, msg)
    unblock_users.short_description = "✅ Blokdan chiqarish"