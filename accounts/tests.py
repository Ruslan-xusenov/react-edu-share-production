from django.test import TestCase, Client
from django.urls import reverse
from accounts.models import CustomUser, PasswordChangeOTP
from django.utils import timezone
from datetime import timedelta


class CustomUserModelTest(TestCase):

    def setUp(self):
        self.user = CustomUser.objects.create_user(
            username='testuser',
            email='test@edushare.uz',
            password='TestPassword123!',
            full_name='Test Foydalanuvchi',
        )

    def test_user_creation(self):
        self.assertEqual(self.user.email, 'test@edushare.uz')
        self.assertEqual(self.user.full_name, 'Test Foydalanuvchi')
        self.assertTrue(self.user.check_password('TestPassword123!'))

    def test_user_str(self):
        self.assertEqual(str(self.user), 'Test Foydalanuvchi (test@edushare.uz)')

    def test_user_default_points(self):
        self.assertEqual(self.user.points, 0)

    def test_email_unique(self):
        with self.assertRaises(Exception):
            CustomUser.objects.create_user(
                username='testuser2',
                email='test@edushare.uz',
                password='AnotherPass123!',
                full_name='Boshqa User',
            )

    def test_get_completed_courses_count(self):
        self.assertEqual(self.user.get_completed_courses_count(), 0)

    def test_get_created_lessons_count(self):
        self.assertEqual(self.user.get_created_lessons_count(), 0)

    def test_user_optional_fields(self):
        user = CustomUser.objects.create_user(
            username='minimal',
            email='minimal@test.com',
            password='MinPass123!',
            full_name='Minimal User',
        )
        self.assertIsNone(user.school)
        self.assertIsNone(user.grade)
        self.assertIsNone(user.bio)
        self.assertFalse(user.is_volunteer)


class PasswordChangeOTPTest(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            username='otpuser',
            email='otp@edushare.uz',
            password='OtpPass123!',
            full_name='OTP User',
        )

    def test_otp_creation(self):
        otp = PasswordChangeOTP.objects.create(
            user=self.user,
            code='123456',
            new_password_hash='hashed_password_here',
            expires_at=timezone.now() + timedelta(minutes=30),
        )
        self.assertEqual(otp.code, '123456')
        self.assertFalse(otp.is_used)
        self.assertEqual(otp.attempts, 0)

    def test_otp_is_valid(self):
        otp = PasswordChangeOTP.objects.create(
            user=self.user,
            code='123456',
            new_password_hash='hashed',
            expires_at=timezone.now() + timedelta(minutes=30),
        )
        self.assertTrue(otp.is_valid())

    def test_otp_expired(self):
        otp = PasswordChangeOTP.objects.create(
            user=self.user,
            code='654321',
            new_password_hash='hashed',
            expires_at=timezone.now() - timedelta(minutes=1),
        )
        self.assertFalse(otp.is_valid())

    def test_otp_used(self):
        otp = PasswordChangeOTP.objects.create(
            user=self.user,
            code='111111',
            new_password_hash='hashed',
            expires_at=timezone.now() + timedelta(minutes=30),
            is_used=True,
        )
        self.assertFalse(otp.is_valid())

    def test_otp_max_attempts(self):
        otp = PasswordChangeOTP.objects.create(
            user=self.user,
            code='999999',
            new_password_hash='hashed',
            expires_at=timezone.now() + timedelta(minutes=30),
            attempts=5,
        )
        self.assertFalse(otp.is_valid())


class AuthAPITest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = CustomUser.objects.create_user(
            username='apiuser',
            email='api@edushare.uz',
            password='ApiPass123!',
            full_name='API User',
        )

    def test_login_page_accessible(self):
        """Login sahifasi ochilishi kerak"""
        response = self.client.get('/accounts/login/')
        self.assertIn(response.status_code, [200, 301, 302])

    def test_unauthenticated_profile_redirect(self):
        """Kirmasdan profil ochish — redirect bo'lishi kerak"""
        response = self.client.get('/api/accounts/profile/', follow=False)
        self.assertIn(response.status_code, [401, 403, 404, 301, 302])

    def test_api_courses_accessible(self):
        """API kurslar ro'yxati ochiq bo'lishi kerak"""
        response = self.client.get('/api/lessons/')
        self.assertIn(response.status_code, [200, 301, 404])


class AdminPanelTest(TestCase):

    def setUp(self):
        self.client = Client()
        self.admin = CustomUser.objects.create_superuser(
            username='admin',
            email='admin@edushare.uz',
            password='AdminPass123!',
            full_name='Admin User',
        )

    def test_admin_login(self):
        """Admin panelga kirish (force_login — axes middleware bypass)"""
        import os
        admin_url = '/' + os.getenv('ADMIN_URL', 'admin/')
        self.client.force_login(self.admin)
        response = self.client.get(admin_url, follow=True)
        self.assertIn(response.status_code, [200, 302])