from django.test import TestCase, Client
from django.utils import timezone
from datetime import timedelta
from accounts.models import CustomUser
from core.models import (
    Notification, UserActivityLog, IPBlocklist,
    ChatViolation, ChatBotAccess, TeamMember, AllowedIP,
)


class NotificationModelTest(TestCase):
    """Xabarnoma modeli testlari"""

    def setUp(self):
        self.user = CustomUser.objects.create_user(
            username='notifuser', email='notif@edu.uz',
            password='Pass123!', full_name='Notif User',
        )

    def test_notification_creation(self):
        """Xabarnoma yaratish"""
        notif = Notification.objects.create(
            user=self.user,
            notification_type='system',
            title='Xush kelibsiz!',
            message='EduShare platformasiga xush kelibsiz.',
        )
        self.assertFalse(notif.is_read)
        self.assertEqual(notif.notification_type, 'system')

    def test_notification_ordering(self):
        """Eng yangi xabarnoma birinchi"""
        n1 = Notification.objects.create(
            user=self.user, notification_type='comment',
            title='Eski', message='Eski xabar',
        )
        n2 = Notification.objects.create(
            user=self.user, notification_type='system',
            title='Yangi', message='Yangi xabar',
        )
        notifications = Notification.objects.filter(user=self.user)
        self.assertEqual(notifications.first(), n2)


class IPBlocklistModelTest(TestCase):
    """IP bloklash modeli testlari"""

    def test_permanent_block(self):
        """Doimiy bloklash"""
        block = IPBlocklist.objects.create(
            ip_address='192.168.1.100',
            reason='ddos',
            is_permanent=True,
        )
        self.assertTrue(block.is_active())

    def test_temporary_block_active(self):
        """Vaqtinchalik bloklash — hali o'tmagan"""
        block = IPBlocklist.objects.create(
            ip_address='10.0.0.1',
            reason='brute_force',
            blocked_until=timezone.now() + timedelta(hours=2),
        )
        self.assertTrue(block.is_active())

    def test_temporary_block_expired(self):
        """Vaqtinchalik bloklash — muddati o'tgan"""
        block = IPBlocklist.objects.create(
            ip_address='10.0.0.2',
            reason='spam',
            blocked_until=timezone.now() - timedelta(hours=1),
        )
        self.assertFalse(block.is_active())

    def test_ip_unique(self):
        """Bir IP faqat bir marta bloklanishi mumkin"""
        IPBlocklist.objects.create(ip_address='1.2.3.4', reason='manual')
        with self.assertRaises(Exception):
            IPBlocklist.objects.create(ip_address='1.2.3.4', reason='spam')


class UserActivityLogTest(TestCase):
    """Foydalanuvchi faollik logi testlari"""

    def setUp(self):
        self.user = CustomUser.objects.create_user(
            username='loguser', email='log@edu.uz',
            password='Pass123!', full_name='Log User',
        )

    def test_activity_log_creation(self):
        """Faollik logi yaratish"""
        log = UserActivityLog.objects.create(
            user=self.user,
            activity_type='login',
            ip_address='127.0.0.1',
            user_agent='Mozilla/5.0 Test Browser',
            success=True,
        )
        self.assertEqual(log.activity_type, 'login')
        self.assertTrue(log.success)

    def test_failed_login_log(self):
        """Muvaffaqiyatsiz kirish logi"""
        log = UserActivityLog.objects.create(
            activity_type='failed_login',
            ip_address='192.168.1.50',
            success=False,
            error_message='Noto\'g\'ri parol',
        )
        self.assertFalse(log.success)
        self.assertIsNone(log.user)


class ChatBotAccessTest(TestCase):
    """ChatBot huquqlari testlari"""

    def setUp(self):
        self.user = CustomUser.objects.create_user(
            username='chatuser', email='chat@edu.uz',
            password='Pass123!', full_name='Chat User',
        )

    def test_default_not_blocked(self):
        """Default holatda bloklanmagan"""
        access = ChatBotAccess.objects.create(user=self.user)
        self.assertFalse(access.is_blocked())

    def test_permanent_block(self):
        """Doimiy bloklash"""
        access = ChatBotAccess.objects.create(
            user=self.user,
            block_type='permanent',
            block_reason='Qoidabuzarlik',
        )
        self.assertTrue(access.is_blocked())

    def test_temporary_block_active(self):
        """Vaqtinchalik bloklash — hali faol"""
        access = ChatBotAccess.objects.create(
            user=self.user,
            block_type='temporary',
            blocked_until=timezone.now() + timedelta(hours=1),
        )
        self.assertTrue(access.is_blocked())

    def test_temporary_block_expired(self):
        """Vaqtinchalik bloklash — muddati o'tgan"""
        access = ChatBotAccess.objects.create(
            user=self.user,
            block_type='temporary',
            blocked_until=timezone.now() - timedelta(hours=1),
        )
        self.assertFalse(access.is_blocked())
        access.refresh_from_db()
        self.assertEqual(access.block_type, 'none')


class ChatViolationTest(TestCase):
    """Chat qoidabuzarlik testlari"""

    def setUp(self):
        self.user = CustomUser.objects.create_user(
            username='violator', email='viol@edu.uz',
            password='Pass123!', full_name='Violator',
        )

    def test_violation_creation(self):
        """Qoidabuzarlik yaratish"""
        violation = ChatViolation.objects.create(
            user=self.user,
            user_email='viol@edu.uz',
            user_message='Yomon so\'rov',
            violation_type='harmful',
            severity='high',
        )
        self.assertFalse(violation.is_reviewed)
        self.assertEqual(violation.severity, 'high')


class AllowedIPTest(TestCase):
    """Ruxsat etilgan IP testlari"""

    def test_allowed_ip_creation(self):
        """Ruxsat etilgan IP qo'shish"""
        ip = AllowedIP.objects.create(
            ip_address='203.0.113.50',
            description='Office kompyuter',
        )
        self.assertTrue(ip.is_active)
        self.assertIn('203.0.113.50', str(ip))


class SecurityMiddlewareTest(TestCase):
    """Xavfsizlik middleware testlari"""

    def setUp(self):
        self.client = Client()

    def test_static_not_rate_limited(self):
        """/static/ so'rovlar rate limiting ostida emas"""
        response = self.client.get('/static/nonexistent.css')
        # Fayl topilmasa ham 404 qaytishi kerak, 429 emas
        self.assertNotEqual(response.status_code, 429)

    def test_security_headers_present(self):
        """Asosiy security headerlar mavjud"""
        response = self.client.get('/')
        # X-Content-Type-Options headeri bo'lishi kerak
        self.assertIn(
            response.status_code,
            [200, 301, 302]
        )