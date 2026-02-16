from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator


class Category(models.Model):
    CATEGORY_CHOICES = [
        ('music', 'Music'),
        ('sport', 'Sport'),
        ('computer_science', 'Computer Science'),
        ('languages', 'Languages'),
        ('exam_prep', 'Exam Prep (IELTS/SAT)'),
        ('soft_skills', 'Soft Skills'),
    ]
    
    name = models.CharField(max_length=100, choices=CATEGORY_CHOICES, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    display_name = models.CharField(max_length=100)
    icon = models.CharField(max_length=50, blank=True, help_text="Icon class name (e.g., 'fa-music')")
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['display_name']
    
    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            self.slug = slugify(self.display_name)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.display_name


class SubCategory(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='subcategories')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name_plural = 'Sub-Categories'
        ordering = ['category', 'name']
        unique_together = ['category', 'name']
    
    def __str__(self):
        return f"{self.category.display_name} → {self.name}"


class Lesson(models.Model):
    LEVEL_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]
    
    title = models.CharField(max_length=200)
    description = models.TextField()
    video_url = models.URLField(blank=True, null=True, help_text="YouTube unlisted link or embedded video URL")
    video_file = models.FileField(
        upload_to='lesson_videos/', 
        blank=True, 
        null=True, 
        validators=[FileExtensionValidator(['mp4', 'webm', 'ogg'])],
        help_text="Direct video file upload"
    )
    resource_file = models.FileField(
        upload_to='lesson_resources/',
        blank=True,
        null=True,
        help_text="Additional lesson resources (PDF, DOCX, etc.)"
    )
    test_file = models.FileField(
        upload_to='lesson_tests/',
        blank=True,
        null=True,
        validators=[FileExtensionValidator(['pdf', 'docx', 'doc'])],
        help_text="Test fayli (PDF yoki DOCX formatida). Test savollarini qo'shmasangiz, bu majburiy."
    )

    thumbnail = models.ImageField(upload_to='lesson_thumbnails/', blank=True, null=True)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='lessons_created')
    sub_category = models.ForeignKey(SubCategory, on_delete=models.CASCADE, related_name='lessons')
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='beginner')
    duration = models.CharField(max_length=50, blank=True, help_text="e.g., '15 minutes'")
    
    views = models.IntegerField(default=0)
    likes = models.IntegerField(default=0)
    saved_by = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='saved_lessons', blank=True)
    
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} by {self.author.full_name}"
    
    def get_youtube_embed_url(self):
        import re
        # Regular watch URL, Short URL, Shorts, and Embed URL formats
        patterns = [
            r'(?:v=|\/v\/|embed\/|youtu\.be\/|shorts\/|\/e\/|watch\?v=|\?v=)([a-zA-Z0-9_-]{11})',
            r'^[a-zA-Z0-9_-]{11}$' # Just the ID
        ]
        
        for pattern in patterns:
            match = re.search(pattern, self.video_url)
            if match:
                return f"https://www.youtube.com/embed/{match.group(1)}"
        
        return self.video_url

    # Rating fields
    average_rating = models.FloatField(default=0.0)
    rating_count = models.IntegerField(default=0)


class LessonView(models.Model):
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='lesson_views')
    ip_address = models.GenericIPAddressField()
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    session_id = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['lesson', 'ip_address']),
        ]

class Rating(models.Model):
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='ratings')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    score = models.IntegerField(choices=[(i, i) for i in range(1, 6)])
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['lesson', 'user']
        indexes = [
            models.Index(fields=['lesson', 'user']),
        ]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Recalculate average rating for the lesson
        self.lesson.rating_count = self.lesson.ratings.count()
        from django.db.models import Avg
        avg = self.lesson.ratings.aggregate(Avg('score'))['score__avg']
        self.lesson.average_rating = avg if avg else 0.0
        self.lesson.save(update_fields=['average_rating', 'rating_count'])



class Assignment(models.Model):
    lesson = models.OneToOneField(Lesson, on_delete=models.CASCADE, related_name='assignment')
    question_text = models.TextField(help_text="The assignment question or task description")
    option_a = models.CharField(max_length=255, blank=True, null=True)
    option_b = models.CharField(max_length=255, blank=True, null=True)
    option_c = models.CharField(max_length=255, blank=True, null=True)
    option_d = models.CharField(max_length=255, blank=True, null=True)
    max_score = models.IntegerField(default=100)
    allow_file_upload = models.BooleanField(default=False, help_text="Allow students to upload files")
    allow_text_answer = models.BooleanField(default=True, help_text="Allow students to submit text answers")
    correct_answer = models.CharField(max_length=255, blank=True, null=True, help_text="Correct answer (e.g., 'A', 'B', 'C', or 'D')")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Assignment for: {self.lesson.title}"


class Submission(models.Model):
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name='submissions')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='submissions')
    answer_text = models.TextField(blank=True, null=True)
    answer_file = models.FileField(
        upload_to='submissions/', 
        blank=True, 
        null=True,
        validators=[FileExtensionValidator(['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'])]
    )
    completed = models.BooleanField(default=False)
    score = models.IntegerField(null=True, blank=True)
    points_awarded = models.BooleanField(default=False)
    certificate_file = models.FileField(upload_to='certificates/', blank=True, null=True, help_text="Upload a certificate for this student")
    feedback = models.TextField(blank=True, null=True, help_text="Feedback from lesson author")
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-submitted_at']
        unique_together = ['assignment', 'user']
    
    def __str__(self):
        status = "✓ Completed" if self.completed else "⋯ Pending"
        return f"{self.user.full_name} - {self.assignment.lesson.title} ({status})"


class Certificate(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='certificates')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='certificates')
    certificate_id = models.CharField(max_length=50, unique=True, editable=False)
    pdf_file = models.FileField(upload_to='certificates/', blank=True, null=True)
    issued_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-issued_at']
        unique_together = ['user', 'lesson']
    
    def __str__(self):
        return f"Certificate: {self.user.full_name} - {self.lesson.title}"
    
    def save(self, *args, **kwargs):
        if not self.certificate_id:
            import uuid
            self.certificate_id = f"EDUSHARE-{uuid.uuid4().hex[:12].upper()}"
        super().save(*args, **kwargs)


class LessonLike(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='lesson_likes')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='liked_by')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['user', 'lesson']
    
    def __str__(self):
        return f"{self.user.full_name} likes {self.lesson.title}"


class Comment(models.Model):
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='comments')
    content = models.TextField()
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    liked_by = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='liked_comments', blank=True)
    disliked_by = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='disliked_comments', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"Comment by {self.user.full_name} on {self.lesson.title}"

class LessonQuiz(models.Model):
    """Quiz questions attached to a lesson by admin"""
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='quiz_questions')
    question_text = models.TextField(help_text="Savol matni")
    option_a = models.CharField(max_length=500, help_text="A variant")
    option_b = models.CharField(max_length=500, help_text="B variant")
    option_c = models.CharField(max_length=500, blank=True, null=True, help_text="C variant (ixtiyoriy)")
    option_d = models.CharField(max_length=500, blank=True, null=True, help_text="D variant (ixtiyoriy)")
    correct_answer = models.CharField(
        max_length=1, 
        choices=[('A', 'A'), ('B', 'B'), ('C', 'C'), ('D', 'D')],
        help_text="To'g'ri javob (A, B, C yoki D)"
    )
    order = models.PositiveIntegerField(default=0, help_text="Savol tartibi")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['order', 'id']
        verbose_name = 'Lesson Quiz Question'
        verbose_name_plural = 'Lesson Quiz Questions'
    
    def __str__(self):
        return f"Q{self.order}: {self.question_text[:50]} ({self.lesson.title})"


class QuizAttempt(models.Model):
    """Tracks a user's quiz attempt for a lesson"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='quiz_attempts')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='quiz_attempts')
    answers = models.JSONField(default=dict, help_text="User answers: {question_id: 'A'/'B'/'C'/'D'}")
    score = models.IntegerField(default=0, help_text="Number of correct answers")
    total_questions = models.IntegerField(default=0)
    passed = models.BooleanField(default=False)
    attempted_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-attempted_at']
    
    def __str__(self):
        status = "✓ Passed" if self.passed else "✗ Failed"
        return f"{self.user.full_name} - {self.lesson.title} ({status}: {self.score}/{self.total_questions})"


class Enrollment(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='enrollments')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='enrolled_students')
    enrolled_at = models.DateTimeField(auto_now_add=True)
    last_watched_time = models.FloatField(default=0.0, help_text="Seconds watched")
    progress = models.FloatField(default=0.0, help_text="Percentage 0-100")
    points_tier = models.IntegerField(default=0, help_text="0: none, 1: 20pts, 2: 40pts, 3: 60pts")
    quiz_passed = models.BooleanField(default=False, help_text="Whether user passed the lesson quiz")

    class Meta:
        unique_together = ['user', 'lesson']
        ordering = ['-enrolled_at']

    def __str__(self):
        return f"{self.user.username} enrolled in {self.lesson.title}"



from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=Submission)
def handle_submission_grading(sender, instance, created, **kwargs):
    """
    Automatically award points and generate certificate when a submission is graded.
    """
    if instance.score is not None and not instance.points_awarded:
        # Award points
        user = instance.user
        user.points += instance.score
        user.save()
        
        # Mark as awarded
        Submission.objects.filter(id=instance.id).update(points_awarded=True)
        
    # Generate/Sync certificate if passed (>= 50%)
    if instance.score is not None and instance.score >= (instance.assignment.max_score / 2):
        cert, created = Certificate.objects.get_or_create(
            user=instance.user,
            lesson=instance.assignment.lesson
        )
        
        # If admin uploaded a specific certificate file, use it
        if instance.certificate_file:
            cert.pdf_file = instance.certificate_file
            cert.save()
        # If no certificate file exists (newly created or was empty), generate one
        elif not cert.pdf_file:
            from .utils import generate_certificate_pdf
            generate_certificate_pdf(cert)