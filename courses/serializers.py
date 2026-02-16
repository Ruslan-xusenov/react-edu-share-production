from rest_framework import serializers
from courses.models import Category, SubCategory, Lesson, Comment, Assignment, Submission, Certificate, LessonQuiz, QuizAttempt, Enrollment
from accounts.models import CustomUser


class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user information for nested serialization"""
    avatar_url = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'full_name', 'email', 'avatar', 'avatar_url', 'points', 'is_staff', 'bio', 'school', 'grade']
        
    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
        return None


class SubCategorySerializer(serializers.ModelSerializer):
    """SubCategory serializer"""
    class Meta:
        model = SubCategory
        fields = ['id', 'name', 'category']


class CategorySerializer(serializers.ModelSerializer):
    """Category serializer with lesson count and subcategories"""
    lessons_count = serializers.SerializerMethodField()
    subcategories = SubCategorySerializer(many=True, read_only=True)
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'display_name', 'description', 'lessons_count', 'subcategories']
        
    def get_lessons_count(self, obj):
        from django.db.models import Count
        # Count lessons through subcategories
        return Lesson.objects.filter(sub_category__category=obj).count()


class CommentSerializer(serializers.ModelSerializer):
    """Lesson comments with user info and recursive replies"""
    author = UserBasicSerializer(source='user', read_only=True)
    replies = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    dislikes_count = serializers.SerializerMethodField()
    user_liked = serializers.SerializerMethodField()
    user_disliked = serializers.SerializerMethodField()
    
    class Meta:
        model = Comment
        fields = [
            'id', 'author', 'content', 'parent', 'created_at', 
            'replies', 'likes_count', 'dislikes_count', 'user_liked', 'user_disliked'
        ]
        read_only_fields = ['author', 'created_at']

    def get_replies(self, obj):
        if obj.parent is None:  # Only get replies for top-level comments
            return CommentSerializer(obj.replies.all(), many=True, context=self.context).data
        return []

    def get_likes_count(self, obj):
        return obj.liked_by.count()

    def get_dislikes_count(self, obj):
        return obj.disliked_by.count()

    def get_user_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.liked_by.filter(id=request.user.id).exists()
        return False

    def get_user_disliked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.disliked_by.filter(id=request.user.id).exists()
        return False


class LessonListSerializer(serializers.ModelSerializer):
    """Lesson list serializer with basic info"""
    category = CategorySerializer(read_only=True, source='sub_category.category')
    author = UserBasicSerializer(read_only=True)
    thumbnail_url = serializers.SerializerMethodField()
    video_file_url = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    is_enrolled = serializers.SerializerMethodField()
    is_saved = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()
    last_watched_time = serializers.SerializerMethodField()
    certificate_id = serializers.SerializerMethodField()
    sub_category_id = serializers.IntegerField(source='sub_category.id', read_only=True)
    
    class Meta:
        model = Lesson
        fields = [
            'id', 'title', 'description', 'category', 'sub_category_id', 'author', 
            'thumbnail', 'thumbnail_url', 'video_url', 'video_file', 'video_file_url',
            'duration', 'level', 'views', 'likes', 'is_liked', 'is_enrolled', 'is_saved', 'progress', 'last_watched_time', 'certificate_id', 'test_file', 'created_at', 'updated_at'
        ]
        
    def get_certificate_id(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            from courses.models import Certificate
            cert = Certificate.objects.filter(user=request.user, lesson=obj).first()
            if cert:
                return cert.id
        return None
        
    def get_thumbnail_url(self, obj):
        if obj.thumbnail:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.thumbnail.url)
        return None
        
    def get_video_file_url(self, obj):
        if obj.video_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.video_file.url)
        return None
        
    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.liked_by.filter(user=request.user).exists()
        return False

    def get_is_enrolled(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            from courses.models import Enrollment
            return Enrollment.objects.filter(user=request.user, lesson=obj).exists()
        return False

    def get_is_saved(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.saved_by.filter(id=request.user.id).exists()
        return False

    def get_progress(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            from courses.models import Enrollment
            enrollment = Enrollment.objects.filter(user=request.user, lesson=obj).first()
            if enrollment:
                return round(enrollment.progress, 1)
        return 0

    def get_last_watched_time(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            from courses.models import Enrollment
            enrollment = Enrollment.objects.filter(user=request.user, lesson=obj).first()
            if enrollment:
                return enrollment.last_watched_time
        return 0



class LessonDetailSerializer(LessonListSerializer):
    """Lesson detail serializer with comments, assignments and quizes"""
    comments = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    has_assignment = serializers.SerializerMethodField()
    has_quiz = serializers.SerializerMethodField()
    quiz_questions_count = serializers.SerializerMethodField()
    quiz_passed = serializers.SerializerMethodField()
    quiz_available = serializers.SerializerMethodField()
    
    test_file_url = serializers.SerializerMethodField()
    
    class Meta(LessonListSerializer.Meta):
        fields = LessonListSerializer.Meta.fields + [
            'comments', 'comments_count', 'has_assignment', 'has_quiz', 
            'quiz_questions_count', 'quiz_passed', 'quiz_available', 'test_file_url'
        ]
        
    def get_comments(self, obj):
        # Only return top-level comments, replies will be nested inside them
        top_level_comments = obj.comments.filter(parent=None).order_by('-created_at')
        return CommentSerializer(top_level_comments, many=True, context=self.context).data

    def get_comments_count(self, obj):
        return obj.comments.count()
        
    def get_has_assignment(self, obj):
        return hasattr(obj, 'assignment')

    def get_has_quiz(self, obj):
        return obj.quiz_questions.exists()
    
    def get_quiz_questions_count(self, obj):
        return obj.quiz_questions.count()

    def get_quiz_passed(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            enrollment = Enrollment.objects.filter(user=request.user, lesson=obj).first()
            if enrollment:
                return enrollment.quiz_passed
        return False

    def get_quiz_available(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            enrollment = Enrollment.objects.filter(user=request.user, lesson=obj).first()
            if enrollment:
                return enrollment.progress >= 99.5
        return False
    
    def get_test_file_url(self, obj):
        if obj.test_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.test_file.url)
        return None


class LessonCreateUpdateSerializer(serializers.ModelSerializer):
    """Lesson create/update serializer"""
    
    class Meta:
        model = Lesson
        fields = [
            'id', 'title', 'description', 'sub_category', 'thumbnail', 
            'video_url', 'video_file', 'duration', 'level'
        ]
        read_only_fields = ['id']
        
    def validate(self, data):
        """Ensure either video_url or video_file is provided"""
        if not data.get('video_url') and not data.get('video_file'):
            raise serializers.ValidationError(
                "Either video_url or video_file must be provided"
            )
        return data


class AssignmentSerializer(serializers.ModelSerializer):
    """Assignment serializer"""
    lesson_title = serializers.CharField(source='lesson.title', read_only=True)
    
    class Meta:
        model = Assignment
        fields = ['id', 'lesson', 'lesson_title', 'question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'max_score']
        read_only_fields = ['correct_answer']  # Hide correct answer from students


class SubmissionSerializer(serializers.ModelSerializer):
    """Assignment submission serializer"""
    assignment_question = serializers.CharField(source='assignment.question_text', read_only=True)
    user = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = Submission
        fields = ['id', 'assignment', 'assignment_question', 'user', 'answer_text', 'answer_file', 'completed', 'score', 'submitted_at']
        read_only_fields = ['user', 'completed', 'score', 'submitted_at']


class EnrollmentSerializer(serializers.Serializer):
    """Serializer for lesson enrollment"""
    lesson_id = serializers.IntegerField()
    
    def validate_lesson_id(self, value):
        try:
            Lesson.objects.get(id=value)
        except Lesson.DoesNotExist:
            raise serializers.ValidationError("Lesson not found")
        return value

class CertificateSerializer(serializers.ModelSerializer):
    lesson_title = serializers.CharField(source='lesson.title', read_only=True)
    author_name = serializers.CharField(source='lesson.author.full_name', read_only=True)
    student_name = serializers.CharField(source='user.full_name', read_only=True)
    category_name = serializers.CharField(source='lesson.sub_category.category.display_name', read_only=True)
    subcategory_name = serializers.CharField(source='lesson.sub_category.name', read_only=True)
    
    class Meta:
        model = Certificate
        fields = [
            'id', 'certificate_id', 'lesson', 'lesson_title', 
            'author_name', 'student_name', 'category_name', 
            'subcategory_name', 'issued_at'
        ]

class LessonQuizSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonQuiz
        fields = ['id', 'lesson', 'question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'order', 'correct_answer']
        # Hide correct answer from students unless it's an admin/staff
    
    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Check if requesting user is not staff
        request = self.context.get('request')
        if request and not request.user.is_staff:
            ret.pop('correct_answer', None)
        return ret

class QuizAttemptSerializer(serializers.ModelSerializer):
    user = UserBasicSerializer(read_only=True)
    class Meta:
        model = QuizAttempt
        fields = ['id', 'user', 'lesson', 'answers', 'score', 'total_questions', 'passed', 'attempted_at']
        read_only_fields = ['user', 'score', 'total_questions', 'passed', 'attempted_at']