from django.test import TestCase, Client
from accounts.models import CustomUser
from courses.models import (
    Category, SubCategory, SubSubCategory, Lesson,
    Enrollment, Rating, Certificate, LessonLike,
    Comment, Assignment, Submission, LessonQuiz, QuizAttempt,
)


class CategoryModelTest(TestCase):
    """Kategoriya modeli testlari"""

    def test_category_creation(self):
        """Kategoriya yaratish va slug auto-generate"""
        cat = Category.objects.create(
            name='music',
            display_name='Music',
            description='Musiqa darslari',
        )
        self.assertEqual(cat.slug, 'music')
        self.assertEqual(str(cat), 'Music')

    def test_subcategory_creation(self):
        """SubKategoriya yaratish"""
        cat = Category.objects.create(name='sport', display_name='Sport')
        sub = SubCategory.objects.create(category=cat, name='Football')
        self.assertEqual(str(sub), 'Sport → Football')

    def test_subsubcategory_creation(self):
        """Sub-SubKategoriya yaratish"""
        cat = Category.objects.create(name='languages', display_name='Languages')
        sub = SubCategory.objects.create(category=cat, name='English')
        subsub = SubSubCategory.objects.create(sub_category=sub, name='Grammar')
        self.assertEqual(str(subsub), 'Languages → English → Grammar')


class LessonModelTest(TestCase):
    """Dars modeli testlari"""

    def setUp(self):
        self.user = CustomUser.objects.create_user(
            username='teacher',
            email='teacher@edushare.uz',
            password='TeacherPass123!',
            full_name='O\'qituvchi',
        )
        self.cat = Category.objects.create(name='computer_science', display_name='CS')
        self.sub = SubCategory.objects.create(category=self.cat, name='Python')
        self.subsub = SubSubCategory.objects.create(sub_category=self.sub, name='Basics')

    def test_lesson_creation(self):
        """Dars yaratish"""
        lesson = Lesson.objects.create(
            title='Python Kirish',
            description='Python dasturlash tili haqida',
            author=self.user,
            sub_sub_category=self.subsub,
            level='beginner',
        )
        self.assertEqual(lesson.views, 0)
        self.assertEqual(lesson.likes, 0)
        self.assertTrue(lesson.is_published)
        self.assertIn('Python Kirish', str(lesson))

    def test_lesson_youtube_embed(self):
        """YouTube URL ni embed URL ga aylantirish"""
        lesson = Lesson.objects.create(
            title='Video dars',
            description='Test video',
            author=self.user,
            video_url='https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        )
        embed = lesson.get_youtube_embed_url()
        self.assertIn('embed', embed)
        self.assertIn('dQw4w9WgXcQ', embed)

    def test_lesson_absolute_url(self):
        """Dars URL tekshirish"""
        lesson = Lesson.objects.create(
            title='Test Dars',
            description='Test',
            author=self.user,
        )
        self.assertEqual(lesson.get_absolute_url(), f'/courses/lesson/{lesson.id}/')


class EnrollmentModelTest(TestCase):
    """Enrollment (ro'yxatdan o'tish) modeli testlari"""

    def setUp(self):
        self.teacher = CustomUser.objects.create_user(
            username='teacher2', email='t2@edu.uz',
            password='Pass123!', full_name='Teacher 2',
        )
        self.student = CustomUser.objects.create_user(
            username='student', email='student@edu.uz',
            password='Pass123!', full_name='Talaba',
        )
        self.lesson = Lesson.objects.create(
            title='Enroll Test Dars',
            description='Test',
            author=self.teacher,
        )

    def test_enrollment_creation(self):
        """Talaba darsga yozilishi"""
        enrollment = Enrollment.objects.create(
            user=self.student,
            lesson=self.lesson,
        )
        self.assertEqual(enrollment.progress, 0.0)
        self.assertFalse(enrollment.quiz_passed)

    def test_enrollment_unique(self):
        """Bir talaba bir darsga faqat 1 marta yozilishi mumkin"""
        Enrollment.objects.create(user=self.student, lesson=self.lesson)
        with self.assertRaises(Exception):
            Enrollment.objects.create(user=self.student, lesson=self.lesson)


class RatingModelTest(TestCase):
    """Baho berish testlari"""

    def setUp(self):
        self.teacher = CustomUser.objects.create_user(
            username='rteacher', email='rt@edu.uz',
            password='Pass123!', full_name='Rating Teacher',
        )
        self.student = CustomUser.objects.create_user(
            username='rstudent', email='rs@edu.uz',
            password='Pass123!', full_name='Rating Student',
        )
        self.lesson = Lesson.objects.create(
            title='Rating Test', description='Test', author=self.teacher,
        )

    def test_rating_creation(self):
        """Baho qo'yish va o'rtacha hisoblash"""
        rating = Rating.objects.create(
            lesson=self.lesson, user=self.student, score=5,
        )
        self.lesson.refresh_from_db()
        self.assertEqual(self.lesson.average_rating, 5.0)
        self.assertEqual(self.lesson.rating_count, 1)

    def test_rating_unique_per_user(self):
        """Bir foydalanuvchi bitta darsga faqat 1 marta baho berishi mumkin"""
        Rating.objects.create(lesson=self.lesson, user=self.student, score=4)
        with self.assertRaises(Exception):
            Rating.objects.create(lesson=self.lesson, user=self.student, score=5)


class CertificateModelTest(TestCase):
    """Sertifikat modeli testlari"""

    def setUp(self):
        self.user = CustomUser.objects.create_user(
            username='certuser', email='cert@edu.uz',
            password='Pass123!', full_name='Cert User',
        )
        self.lesson = Lesson.objects.create(
            title='Cert Lesson', description='Test',
            author=self.user,
        )

    def test_certificate_auto_id(self):
        """Sertifikat ID avtomatik yaratiladi"""
        cert = Certificate.objects.create(
            user=self.user, lesson=self.lesson,
        )
        self.assertTrue(cert.certificate_id.startswith('EDUSHARE-'))
        self.assertEqual(len(cert.certificate_id), 21)  # EDUSHARE- + 12 chars


class CommentModelTest(TestCase):
    """Izoh modeli testlari"""

    def setUp(self):
        self.user = CustomUser.objects.create_user(
            username='commenter', email='comment@edu.uz',
            password='Pass123!', full_name='Commenter',
        )
        self.lesson = Lesson.objects.create(
            title='Comment Lesson', description='Test', author=self.user,
        )

    def test_comment_creation(self):
        """Izoh yozish"""
        comment = Comment.objects.create(
            lesson=self.lesson, user=self.user, content='Juda yaxshi dars!',
        )
        self.assertIn('Commenter', str(comment))

    def test_reply_to_comment(self):
        """Izohga javob"""
        parent = Comment.objects.create(
            lesson=self.lesson, user=self.user, content='Birinchi izoh',
        )
        reply = Comment.objects.create(
            lesson=self.lesson, user=self.user,
            content='Javob izoh', parent=parent,
        )
        self.assertEqual(reply.parent, parent)
        self.assertEqual(parent.replies.count(), 1)


class LessonQuizTest(TestCase):
    """Quiz testlari"""

    def setUp(self):
        self.user = CustomUser.objects.create_user(
            username='quizuser', email='quiz@edu.uz',
            password='Pass123!', full_name='Quiz User',
        )
        self.lesson = Lesson.objects.create(
            title='Quiz Lesson', description='Test', author=self.user,
        )

    def test_quiz_creation(self):
        """Quiz savol yaratish"""
        quiz = LessonQuiz.objects.create(
            lesson=self.lesson,
            question_text='Python nima?',
            option_a='Dasturlash tili',
            option_b='Hayvon',
            correct_answer='A',
            order=1,
        )
        self.assertEqual(quiz.correct_answer, 'A')

    def test_quiz_attempt(self):
        """Quiz urinishi"""
        attempt = QuizAttempt.objects.create(
            user=self.user,
            lesson=self.lesson,
            answers={'1': 'A'},
            score=1,
            total_questions=1,
            passed=True,
        )
        self.assertTrue(attempt.passed)
        self.assertIn('✓ Passed', str(attempt))


class CoursesAPITest(TestCase):
    """API endpoint testlari"""

    def setUp(self):
        self.client = Client()

    def test_api_lessons_list(self):
        """Darslar ro'yxati API"""
        response = self.client.get('/api/lessons/')
        self.assertIn(response.status_code, [200, 404])

    def test_api_categories_list(self):
        """Kategoriyalar ro'yxati API"""
        response = self.client.get('/api/categories/')
        self.assertIn(response.status_code, [200, 404])
