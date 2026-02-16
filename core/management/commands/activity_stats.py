"""
Sayt statistikasini ko'rish kommandasi
python manage.py activity_stats
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from core.models import UserActivityLog, IPBlocklist

User = get_user_model()


class Command(BaseCommand):
    help = 'Sayt faolligi va xavfsizlik statistikasini ko\'rsatadi'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='Necha kunlik statistikani ko\'rsatish (default: 7)'
        )

    def handle(self, *args, **options):
        days = options['days']
        start_date = timezone.now() - timedelta(days=days)
        
        self.stdout.write(self.style.SUCCESS(f'\n{"="*60}'))
        self.stdout.write(self.style.SUCCESS(f'EDUSHARE STATISTIKASI - Oxirgi {days} kun'))
        self.stdout.write(self.style.SUCCESS(f'{"="*60}\n'))
        
        # Umumiy statistika
        total_users = User.objects.count()
        new_users = User.objects.filter(date_joined__gte=start_date).count()
        
        self.stdout.write(self.style.HTTP_INFO('📊 FOYDALANUVCHILAR:'))
        self.stdout.write(f'   Jami: {total_users}')
        self.stdout.write(f'   Yangi ({days} kun): {new_users}\n')
        
        # Login statistikasi
        total_logins = UserActivityLog.objects.filter(
            activity_type='login',
            timestamp__gte=start_date
        ).count()
        
        failed_logins = UserActivityLog.objects.filter(
            activity_type='failed_login',
            timestamp__gte=start_date
        ).count()
        
        registrations = UserActivityLog.objects.filter(
            activity_type='registration',
            timestamp__gte=start_date
        ).count()
        
        self.stdout.write(self.style.HTTP_INFO('🔐 KIRISH STATISTIKASI:'))
        self.stdout.write(f'   Muvaffaqiyatli kirish: {total_logins}')
        self.stdout.write(f'   Muvaffaqiyatsiz kirish: {failed_logins}')
        self.stdout.write(f'   Yangi registratsiyalar: {registrations}\n')
        
        # Qurilma statistikasi
        mobile_count = UserActivityLog.objects.filter(
            device_type='mobile',
            timestamp__gte=start_date
        ).count()
        
        desktop_count = UserActivityLog.objects.filter(
            device_type='desktop',
            timestamp__gte=start_date
        ).count()
        
        tablet_count = UserActivityLog.objects.filter(
            device_type='tablet',
            timestamp__gte=start_date
        ).count()
        
        self.stdout.write(self.style.HTTP_INFO('📱 QURILMA TURLARI:'))
        self.stdout.write(f'   Mobil: {mobile_count}')
        self.stdout.write(f'   Desktop: {desktop_count}')
        self.stdout.write(f'   Planshet: {tablet_count}\n')
        
        # Top 5 IP addresslar
        from django.db.models import Count
        top_ips = UserActivityLog.objects.filter(
            timestamp__gte=start_date
        ).values('ip_address').annotate(
            count=Count('id')
        ).order_by('-count')[:5]
        
        self.stdout.write(self.style.HTTP_INFO('🌐 TOP 5 IP MANZILLAR:'))
        for idx, item in enumerate(top_ips, 1):
            self.stdout.write(f'   {idx}. {item["ip_address"]}: {item["count"]} marta')
        
        # IP bloklash statistikasi
        active_blocks = IPBlocklist.objects.filter(
            is_permanent=True
        ).count() + IPBlocklist.objects.filter(
            blocked_until__gt=timezone.now()
        ).count()
        
        total_blocks = IPBlocklist.objects.count()
        
        self.stdout.write(self.style.WARNING(f'\n🔒 XAVFSIZLIK:'))
        self.stdout.write(f'   Bloklangan IP lar: {active_blocks} faol / {total_blocks} jami')
        
        # Oxirgi 10 ta faollik
        recent_activities = UserActivityLog.objects.select_related('user').filter(
            timestamp__gte=start_date
        ).order_by('-timestamp')[:10]
        
        self.stdout.write(self.style.HTTP_INFO(f'\n📝 OXIRGI 10 TA FAOLLIK:'))
        for activity in recent_activities:
            user_info = activity.user.email if activity.user else 'Anonim'
            activity_type = activity.get_activity_type_display()
            timestamp = activity.timestamp.strftime('%Y-%m-%d %H:%M:%S')
            status = '✅' if activity.success else '❌'
            
            self.stdout.write(
                f'   {status} {timestamp} | {user_info} | {activity_type} | {activity.ip_address}'
            )
        
        self.stdout.write(self.style.SUCCESS(f'\n{"="*60}\n'))
        self.stdout.write(self.style.SUCCESS('✅ Statistika muvaffaqiyatli yuklandi!'))
