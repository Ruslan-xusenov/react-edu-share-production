from django.contrib import admin
from django.utils.html import format_html
from django.core.exceptions import ValidationError
from .models import Category, SubCategory, Lesson, Assignment, Submission, Certificate, LessonLike, LessonQuiz


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['display_name', 'name', 'icon', 'created_at']
    search_fields = ['display_name', 'name']


@admin.register(SubCategory)
class SubCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'created_at']
    list_filter = ['category']
    search_fields = ['name']


class AssignmentInline(admin.StackedInline):
    model = Assignment
    extra = 0


class LessonQuizInline(admin.TabularInline):
    """Inline formset for adding quiz questions to a lesson"""
    model = LessonQuiz
    extra = 1
    min_num = 0
    fields = ['question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'order']
    verbose_name = "Test savoli"
    verbose_name_plural = "Test savollari"


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'sub_category', 'level', 'views', 'likes', 'is_published', 'has_test', 'created_at']
    list_filter = ['level', 'is_published', 'sub_category__category', 'created_at']
    search_fields = ['title', 'description', 'author__full_name']
    readonly_fields = ['views', 'likes']
    inlines = [LessonQuizInline, AssignmentInline]
    fieldsets = (
        ('Asosiy ma\'lumotlar', {
            'fields': ('title', 'description', 'author', 'sub_category', 'level', 'duration')
        }),
        ('Media', {
            'fields': ('video_url', 'video_file', 'thumbnail')
        }),
        ('Resurslar va Test', {
            'fields': ('resource_file', 'test_file'),
            'description': 'Test savollarini quyida qo\'shing yoki test faylini yuklang. Kamida bittasi majburiy!'
        }),
        ('Statistika', {
            'fields': ('views', 'likes', 'is_published')
        })
    )
    
    def has_test(self, obj):
        """Display if lesson has test questions or test file"""
        if obj.id:
            has_questions = obj.quiz_questions.exists()
            has_file = bool(obj.test_file)
            if has_questions and has_file:
                return format_html('<span style="color: green;">✓ Savol va Fayl</span>')
            elif has_questions:
                return format_html('<span style="color: green;">✓ Savollar</span>')
            elif has_file:
                return format_html('<span style="color: green;">✓ Fayl</span>')
            else:
                return format_html('<span style="color: red;">✗ Yo\'q</span>')
        return '-'
    has_test.short_description = 'Test'
    
    def save_model(self, request, obj, form, change):
        """Custom validation to ensure test exists"""
        super().save_model(request, obj, form, change)
    
    def save_formset(self, request, form, formset, change):
        """Save the formset and validate test requirement"""
        instances = formset.save(commit=False)
        for instance in instances:
            instance.save()
        formset.save_m2m()
        
        # After saving, validate that lesson has test
        lesson = form.instance
        has_quiz_questions = lesson.quiz_questions.exists()
        has_test_file = bool(lesson.test_file)
        
        if not has_quiz_questions and not has_test_file:
            raise ValidationError(
                "Dars uchun test majburiy! Kamida bitta test savoli qo'shing yoki test faylini yuklang."
            )


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ['lesson', 'max_score', 'allow_file_upload', 'allow_text_answer', 'created_at']
    list_filter = ['allow_file_upload', 'allow_text_answer']
    search_fields = ['lesson__title', 'question_text']


@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ['user', 'assignment', 'completed', 'score', 'submitted_at']
    list_filter = ['completed', 'submitted_at']
    search_fields = ['user__full_name', 'assignment__lesson__title']
    readonly_fields = ['submitted_at', 'updated_at']


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ['certificate_id', 'user', 'lesson', 'issued_at']
    list_filter = ['issued_at']
    search_fields = ['user__full_name', 'lesson__title', 'certificate_id']
    readonly_fields = ['certificate_id', 'issued_at']


@admin.register(LessonLike)
class LessonLikeAdmin(admin.ModelAdmin):
    list_display = ['user', 'lesson', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__full_name', 'lesson__title']


@admin.register(LessonQuiz)
class LessonQuizAdmin(admin.ModelAdmin):
    """Standalone admin for quiz questions"""
    list_display = ['lesson', 'question_text_short', 'correct_answer', 'order', 'created_at']
    list_filter = ['lesson', 'correct_answer', 'created_at']
    search_fields = ['lesson__title', 'question_text']
    list_editable = ['order']
    ordering = ['lesson', 'order']
    
    def question_text_short(self, obj):
        return obj.question_text[:50] + '...' if len(obj.question_text) > 50 else obj.question_text
    question_text_short.short_description = 'Savol'