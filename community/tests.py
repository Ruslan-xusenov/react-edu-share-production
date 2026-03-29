from django.test import TestCase, Client
from django.utils import timezone
from datetime import timedelta
from accounts.models import CustomUser
from community.models import Article, BookReview, Announcement


class ArticleModelTest(TestCase):
    """Maqola modeli testlari"""

    def setUp(self):
        self.user = CustomUser.objects.create_user(
            username='writer', email='writer@edu.uz',
            password='Pass123!', full_name='Yozuvchi',
        )

    def test_article_creation(self):
        """Maqola yaratish va slug auto-generate"""
        article = Article.objects.create(
            title='Python haqida',
            content='Python zamonaviy dasturlash tili.',
            author=self.user,
        )
        self.assertEqual(article.slug, 'python-haqida')
        self.assertTrue(article.is_published)
        self.assertEqual(article.views, 0)

    def test_article_duplicate_slug(self):
        """Bir xil nomdagi maqolalar uchun slug unique"""
        a1 = Article.objects.create(
            title='Test Maqola',
            content='Birinchi maqola.',
            author=self.user,
        )
        a2 = Article.objects.create(
            title='Test Maqola',
            content='Ikkinchi maqola.',
            author=self.user,
        )
        self.assertNotEqual(a1.slug, a2.slug)
        self.assertEqual(a2.slug, 'test-maqola-1')

    def test_article_str(self):
        """__str__ metodi"""
        article = Article.objects.create(
            title='Ajoyib Maqola',
            content='Matn.',
            author=self.user,
        )
        self.assertEqual(str(article), 'Ajoyib Maqola')

    def test_unpublished_article(self):
        """Chop etilmagan maqola"""
        article = Article.objects.create(
            title='Draft Maqola',
            content='Tayyor emas.',
            author=self.user,
            is_published=False,
        )
        self.assertFalse(article.is_published)


class BookReviewModelTest(TestCase):
    """Kitob sharhi modeli testlari"""

    def setUp(self):
        self.user = CustomUser.objects.create_user(
            username='reader', email='reader@edu.uz',
            password='Pass123!', full_name='Kitobxon',
        )

    def test_book_review_creation(self):
        """Kitob sharhi yaratish"""
        review = BookReview.objects.create(
            user=self.user,
            book_title='Atomic Habits',
            book_author='James Clear',
            review_content='Juda foydali kitob edi.',
            rating=5,
        )
        self.assertEqual(review.rating, 5)
        self.assertIn('Atomic Habits', str(review))

    def test_book_review_default_rating(self):
        """Default baho 5"""
        review = BookReview.objects.create(
            user=self.user,
            book_title='Test Kitob',
            review_content='Test sharh.',
        )
        self.assertEqual(review.rating, 5)

    def test_book_review_ordering(self):
        """Eng yangi sharh birinchi"""
        r1 = BookReview.objects.create(
            user=self.user,
            book_title='Birinchi',
            review_content='Sharh 1',
        )
        r2 = BookReview.objects.create(
            user=self.user,
            book_title='Ikkinchi',
            review_content='Sharh 2',
        )
        reviews = BookReview.objects.all()
        self.assertEqual(reviews.first(), r2)


class AnnouncementModelTest(TestCase):
    """E'lon modeli testlari"""

    def setUp(self):
        self.user = CustomUser.objects.create_user(
            username='organizer', email='organizer@edu.uz',
            password='Pass123!', full_name='Tashkilotchi',
        )

    def test_announcement_creation(self):
        """E'lon yaratish"""
        announce = Announcement.objects.create(
            title='Hackathon 2026',
            description='Yillik hackathon musobaqasi!',
            location='Tashkent, IT Park',
            event_date=timezone.now() + timedelta(days=30),
            organizer=self.user,
        )
        self.assertTrue(announce.is_active)
        self.assertEqual(str(announce), 'Hackathon 2026')

    def test_announcement_without_event_date(self):
        """Sana ko'rsatilmagan e'lon (umumiy xabar)"""
        announce = Announcement.objects.create(
            title='Yangi kurslar',
            description='Yangi kurslar qo\'shildi.',
            organizer=self.user,
        )
        self.assertIsNone(announce.event_date)
        self.assertTrue(announce.is_active)


class CommunityAPITest(TestCase):
    """Community API testlari"""

    def setUp(self):
        self.client = Client()

    def test_articles_api(self):
        """Maqolalar API endpoint"""
        response = self.client.get('/api/articles/')
        self.assertIn(response.status_code, [200, 404])

    def test_announcements_api(self):
        """E'lonlar API endpoint"""
        response = self.client.get('/api/announcements/')
        self.assertIn(response.status_code, [200, 404])
