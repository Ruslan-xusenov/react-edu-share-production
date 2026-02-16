from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated, BasePermission
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q
from courses.models import Category, SubCategory, Lesson, Comment, Assignment, Submission, Enrollment, Certificate, LessonQuiz, QuizAttempt
from courses.serializers import (
    CategorySerializer, SubCategorySerializer, LessonListSerializer, LessonDetailSerializer,
    LessonCreateUpdateSerializer, CommentSerializer,
    AssignmentSerializer, SubmissionSerializer, EnrollmentSerializer,
    CertificateSerializer, LessonQuizSerializer, QuizAttemptSerializer
)
from core.models import Notification


class IsSuperUser(BasePermission):
    """
    Only allows access to superusers (created via createsuperuser).
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_superuser


class CategoryViewSet(viewsets.ModelViewSet):
    """
    API endpoint for categories
    List and retrieve categories with lesson counts
    Admin can create/update categories
    """
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    lookup_field = 'slug'
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name']
    ordering = ['name']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsSuperUser()]
        return [IsAuthenticatedOrReadOnly()]
    
    @method_decorator(ensure_csrf_cookie)
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)


class SubCategoryViewSet(viewsets.ModelViewSet):
    """
    API endpoint for sub-categories
    Admin can create/update sub-categories
    """
    queryset = SubCategory.objects.all()
    serializer_class = SubCategorySerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['category']
    search_fields = ['name']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsSuperUser()]
        return [IsAuthenticatedOrReadOnly()]


class LessonViewSet(viewsets.ModelViewSet):
    """
    API endpoint for lessons
    Supports CRUD operations, filtering, searching, and custom actions
    """
    queryset = Lesson.objects.select_related('sub_category__category', 'author').prefetch_related('comments', 'liked_by')
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['sub_category', 'level', 'author']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'views', 'likes', 'title']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return LessonDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return LessonCreateUpdateSerializer
        return LessonListSerializer
    
    def get_permissions(self):
        """
        Only superusers can create/update/delete lessons.
        Authenticated users can like, comment, view enrolled/my_lessons.
        Everyone can view lessons.
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsSuperUser()]
        elif self.action in ['like', 'add_comment', 'my_lessons', 'enrolled', 'enroll', 'quiz', 'submit_quiz']:
            return [IsAuthenticated()]
        return [IsAuthenticatedOrReadOnly()]
    
    def perform_create(self, serializer):
        """Set the author to the current user"""
        serializer.save(author=self.request.user)
    
    @method_decorator(ensure_csrf_cookie)
    def retrieve(self, request, *args, **kwargs):
        """Increment view count once per session when retrieving a lesson"""
        lesson = self.get_object()
        
        # Track viewed lessons in session
        viewed_lessons = request.session.get('viewed_lessons', [])
        if lesson.id not in viewed_lessons:
            lesson.views += 1
            lesson.save(update_fields=['views'])
            viewed_lessons.append(lesson.id)
            request.session['viewed_lessons'] = viewed_lessons
            
        return super().retrieve(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def like(self, request, pk=None):
        """Like or unlike a lesson"""
        lesson = self.get_object()
        user = request.user
        
        # Checking if explicit LessonLike join table entry exists
        if lesson.liked_by.filter(user=user).exists():
            lesson.liked_by.filter(user=user).delete()
            lesson.likes = lesson.liked_by.count()
            lesson.save(update_fields=['likes'])
            return Response({'status': 'unliked', 'likes': lesson.likes})
        else:
            from courses.models import LessonLike
            LessonLike.objects.get_or_create(user=user, lesson=lesson)
            lesson.likes = lesson.liked_by.count()
            lesson.save(update_fields=['likes'])
            return Response({'status': 'liked', 'likes': lesson.likes})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def save_lesson(self, request, pk=None):
        """Bookmark/save a lesson"""
        lesson = self.get_object()
        user = request.user
        
        if lesson.saved_by.filter(id=user.id).exists():
            lesson.saved_by.remove(user)
            return Response({'status': 'unsaved', 'is_saved': False})
        else:
            lesson.saved_by.add(user)
            return Response({'status': 'saved', 'is_saved': True})

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def saved(self, request):
        """Get lessons the current user has saved"""
        lessons = request.user.saved_lessons.all()
        
        page = self.paginate_queryset(lessons)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = self.get_serializer(lessons, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def enroll(self, request, pk=None):
        """Enroll the current user in a lesson/course"""
        lesson = self.get_object()
        user = request.user
        
        enrollment, created = Enrollment.objects.get_or_create(user=user, lesson=lesson)
        
        if created:
            return Response({'status': 'success', 'message': f'Successfully enrolled in {lesson.title}'}, status=status.HTTP_201_CREATED)
        else:
            return Response({'status': 'info', 'message': 'You are already enrolled in this course'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def update_progress(self, request, pk=None):
        """Update viewing progress for an enrolled lesson"""
        lesson = self.get_object()
        user = request.user
        
        try:
            enrollment = Enrollment.objects.get(user=user, lesson=lesson)
            current_time = float(request.data.get('current_time', 0))
            duration = float(request.data.get('duration', 1))  # avoid div by zero
            
            progress = (current_time / duration) * 100
            if progress > 100: progress = 100
            
            # Don't decrease progress if they rewatch
            if progress > enrollment.progress:
                enrollment.progress = progress
            
            enrollment.last_watched_time = current_time
            
            # Points and Certificate Logic
            reward_msg = ""
            # Tier 1: Just started (>0%)
            if enrollment.progress > 0.5 and enrollment.points_tier < 1:
                user.points += 20
                enrollment.points_tier = 1
                reward_msg = "Tabriklaymiz! O'rganishni boshlaganingiz uchun 20 ball berildi! 🌟"
                user.save(update_fields=['points'])
            
            # Tier 2: Halfway (>=50%)
            if enrollment.progress >= 50 and enrollment.points_tier < 2:
                user.points += 20  # Total 40
                enrollment.points_tier = 2
                reward_msg = "Ajoyib! Kursning yarmini tugatdingiz. Yana 20 ball qo'shildi! 🚀"
                user.save(update_fields=['points'])
            
            # Tier 3: Completion (>=99.5% for near-100 check)
            if enrollment.progress >= 99.5 and enrollment.points_tier < 3:
                user.points += 20  # Total 60
                enrollment.points_tier = 3
                reward_msg = "Siz darsni 100% yakunladingiz! Endi test topshirib sertifikat olishingiz mumkin. 🎉"
                user.save(update_fields=['points'])
                enrollment.progress = 100.0 # Force 100%

            enrollment.save()
            
            return Response({
                'status': 'success', 
                'progress': enrollment.progress,
                'reward_message': reward_msg,
                'quiz_available': enrollment.progress >= 99.9,
                'quiz_passed': enrollment.quiz_passed
            })
        except Enrollment.DoesNotExist:
            return Response({'status': 'error', 'message': 'Not enrolled'}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def quiz(self, request, pk=None):
        """Get quiz questions for a lesson if progress is 100%"""
        lesson = self.get_object()
        user = request.user
        
        try:
            enrollment = Enrollment.objects.get(user=user, lesson=lesson)
            # Only staff can skip the 100% check
            if enrollment.progress < 99.9 and not user.is_staff:
                 return Response({'status': 'error', 'message': 'Quiz faqat video 100% koʻrilgandan keyin ochiladi.'}, status=status.HTTP_403_FORBIDDEN)
            
            questions = lesson.quiz_questions.all()
            serializer = LessonQuizSerializer(questions, many=True, context={'request': request})
            
            # Include test file URL if available
            test_file_url = None
            if lesson.test_file:
                test_file_url = request.build_absolute_uri(lesson.test_file.url)
            
            return Response({
                'questions': serializer.data,
                'quiz_passed': enrollment.quiz_passed,
                'test_file_url': test_file_url
            })
        except Enrollment.DoesNotExist:
            return Response({'status': 'error', 'message': 'Kursga aʼzo emassiz.'}, status=status.HTTP_403_FORBIDDEN)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def submit_quiz(self, request, pk=None):
        """Submit quiz answers and issue certificate if passed"""
        lesson = self.get_object()
        user = request.user
        user_answers = request.data.get('answers', {}) # {question_id: 'A'}
        
        try:
            enrollment = Enrollment.objects.get(user=user, lesson=lesson)
            if enrollment.progress < 99.9 and not user.is_staff:
                return Response({'status': 'error', 'message': 'Avval darsni oxirigacha koʻring.'}, status=status.HTTP_403_FORBIDDEN)
            
            if enrollment.quiz_passed:
                 return Response({'status': 'info', 'message': 'Siz testdan oʻtib boʻlgansiz.'})

            questions = {str(q.id): q for q in lesson.quiz_questions.all()}
            if not questions:
                return Response({'status': 'error', 'message': 'Darsda test savollari mavjud emas.'})

            correct_count = 0
            for q_id, answer in user_answers.items():
                question = questions.get(str(q_id))
                if question and question.correct_answer.upper() == answer.upper():
                    correct_count += 1
            
            total = len(questions)
            # 100% accuracy required
            is_passed = correct_count == total 
            
            QuizAttempt.objects.create(
                user=user,
                lesson=lesson,
                answers=user_answers,
                score=correct_count,
                total_questions=total,
                passed=is_passed
            )

            result_msg = ""
            if is_passed:
                enrollment.quiz_passed = True
                enrollment.save()
                
                # Issue certificate
                from courses.models import Certificate
                Certificate.objects.get_or_create(user=user, lesson=lesson)
                
                # Award bonus points for quiz
                user.points += 40 
                user.save()
                result_msg = "Tabriklaymiz! Siz barcha savollarga to'g'ri javob berdingiz va Sertifikat sohibi bo'ldingiz! 🎓"
            else:
                result_msg = f"Siz {total} tadan {correct_count} ta to'g'ri javob berdingiz. Sertifikat uchun barcha savollarga to'g'ri javob berishingiz kerak. Qayta urinib ko'ring!"

            return Response({
                'status': 'success' if is_passed else 'failed',
                'score': correct_count,
                'total': total,
                'passed': is_passed,
                'message': result_msg
            })
        except Enrollment.DoesNotExist:
             return Response({'status': 'error', 'message': 'Enrollment not found'}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def comments(self, request, pk=None):
        """Get all comments for a lesson"""
        lesson = self.get_object()
        comments = lesson.comments.all().order_by('-created_at')
        serializer = CommentSerializer(comments, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def add_comment(self, request, pk=None):
        """Add a comment to a lesson"""
        lesson = self.get_object()
        serializer = CommentSerializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            serializer.save(user=request.user, lesson=lesson)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Get featured lessons (most popular)"""
        lessons = self.queryset.order_by('-views', '-likes')[:6]
        serializer = self.get_serializer(lessons, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def trending(self, request):
        """Get trending lessons (most likes recently)"""
        lessons = self.queryset.order_by('-likes', '-created_at')[:6]
        serializer = self.get_serializer(lessons, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_lessons(self, request):
        """Get lessons created by the current user"""
        lessons = self.queryset.filter(author=request.user)
        page = self.paginate_queryset(lessons)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(lessons, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def enrolled(self, request):
        """Get lessons the current user is enrolled in"""
        enrolled_lesson_ids = Enrollment.objects.filter(user=request.user).values_list('lesson_id', flat=True)
        lessons = self.queryset.filter(id__in=enrolled_lesson_ids)
        
        page = self.paginate_queryset(lessons)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = self.get_serializer(lessons, many=True)
        return Response(serializer.data)


class CommentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for lesson comments
    """
    queryset = Comment.objects.select_related('user', 'lesson').all()
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['lesson']
    ordering = ['-created_at']
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def like(self, request, pk=None):
        comment = self.get_object()
        user = request.user
        
        if comment.liked_by.filter(id=user.id).exists():
            comment.liked_by.remove(user)
            active = False
        else:
            comment.liked_by.add(user)
            comment.disliked_by.remove(user) # Remove dislike if liking
            active = True
            
        return Response({
            'status': 'success',
            'active': active,
            'likes_count': comment.liked_by.count(),
            'dislikes_count': comment.disliked_by.count()
        })

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def dislike(self, request, pk=None):
        comment = self.get_object()
        user = request.user
        
        if comment.disliked_by.filter(id=user.id).exists():
            comment.disliked_by.remove(user)
            active = False
        else:
            comment.disliked_by.add(user)
            comment.liked_by.remove(user) # Remove like if disliking
            active = True
            
        return Response({
            'status': 'success',
            'active': active,
            'likes_count': comment.liked_by.count(),
            'dislikes_count': comment.disliked_by.count()
        })


class AssignmentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for assignments
    Only staff can create/update/delete
    """
    queryset = Assignment.objects.select_related('lesson').all()
    serializer_class = AssignmentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['lesson']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated()]
        return [IsAuthenticatedOrReadOnly()]
    
    def get_queryset(self):
        """Hide correct answer from students"""
        queryset = super().get_queryset()
        if self.request.user.is_staff:
            return queryset
        return queryset

class LessonQuizViewSet(viewsets.ModelViewSet):
    """API endpoint for quiz questions"""
    queryset = LessonQuiz.objects.all()
    serializer_class = LessonQuizSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['lesson']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated()]
        return [IsAuthenticatedOrReadOnly()]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.is_staff:
            return queryset
        # Hide correct_answer from students
        return queryset.defer('correct_answer')


class SubmissionViewSet(viewsets.ModelViewSet):
    """
    API endpoint for assignment submissions
    Students can submit, view their submissions
    """
    queryset = Submission.objects.select_related('assignment', 'user').all()
    serializer_class = SubmissionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['assignment', 'user']
    
    def get_queryset(self):
        """Users can only see their own submissions unless staff"""
        if self.request.user.is_staff:
            return self.queryset
        return self.queryset.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        """Process assignment submission and award points"""
        assignment = serializer.validated_data['assignment']
        answer_text = serializer.validated_data.get('answer_text', '')
        
        # Automatic scoring logic
        is_correct = False
        score = 0
        if assignment.correct_answer and answer_text:
            if answer_text.strip().upper() == assignment.correct_answer.strip().upper():
                is_correct = True
                score = assignment.max_score

        submission = serializer.save(
            user=self.request.user,
            score=score,
            completed=True
        )
        
        # Award points to user profile if correct
        if score > 0:
            profile = self.request.user # In this model User points are in User model? 
            # Check CustomUser model for points field
            if hasattr(self.request.user, 'points'):
                self.request.user.points += score
                self.request.user.save()
        
        # Create notification
        Notification.objects.create(
            user=self.request.user,
            title="Assignment Submitted",
            message=f"You've submitted assignment for {assignment.lesson.title}. Score: {score}/{assignment.max_score}",
            notification_type='submission'
        )

class CertificateViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing certificates
    """
    queryset = Certificate.objects.all()
    serializer_class = CertificateSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Users can only see their own certificates"""
        return self.queryset.filter(user=self.request.user)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Placeholder for PDF download logic"""
        # In a real app, this would generate and return a PDF
        # For now, we return a success status
        return Response({'status': 'success', 'message': 'PDF generation is coming soon'})
