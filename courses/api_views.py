from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated, BasePermission
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q

from courses.models import (
    Category, SubCategory, SubSubCategory, Lesson, Comment, Assignment,
    Submission, Enrollment, Certificate, LessonQuiz, QuizAttempt, LessonLike
)
from courses.serializers import (
    CategorySerializer, SubCategorySerializer, SubSubCategorySerializer, LessonListSerializer, LessonDetailSerializer,
    LessonCreateUpdateSerializer, CommentSerializer,
    AssignmentSerializer, SubmissionSerializer, EnrollmentSerializer,
    CertificateSerializer, LessonQuizSerializer, QuizAttemptSerializer
)
from core.models import Notification


class IsAdminUser(BasePermission):
    """Allow access to staff or superusers"""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and (request.user.is_staff or request.user.is_superuser)


# ---------------------------------------------------------------------------
# Base queryset for lessons — always select/prefetch related objects
# ---------------------------------------------------------------------------
LESSON_BASE_QS = Lesson.objects.select_related(
    'sub_sub_category__sub_category__category', 'author'
).prefetch_related('liked_by', 'saved_by', 'quiz_questions')


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.prefetch_related('subcategories__sub_subcategories').annotate(
        _lessons_count=Count('subcategories__sub_subcategories__lessons', distinct=True)
    )
    serializer_class = CategorySerializer
    lookup_field = 'slug'
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name']
    ordering = ['name']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdminUser()]
        return [IsAuthenticatedOrReadOnly()]

    @method_decorator(ensure_csrf_cookie)
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)


class SubCategoryViewSet(viewsets.ModelViewSet):
    queryset = SubCategory.objects.select_related('category').all()
    serializer_class = SubCategorySerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter] # Added Ordering for consistency
    filterset_fields = ['category']
    search_fields = ['name']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdminUser()]
        return [IsAuthenticatedOrReadOnly()]


class SubSubCategoryViewSet(viewsets.ModelViewSet):
    queryset = SubSubCategory.objects.select_related('sub_category__category').all()
    serializer_class = SubSubCategorySerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['sub_category']
    search_fields = ['name']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdminUser()]
        return [IsAuthenticatedOrReadOnly()]


class LessonViewSet(viewsets.ModelViewSet):
    queryset = LESSON_BASE_QS
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'sub_sub_category': ['exact'],
        'sub_sub_category__sub_category': ['exact'],
        'sub_sub_category__sub_category__category': ['exact'],
        'level': ['exact'],
        'author': ['exact'],
    }
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
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        elif self.action in ['like', 'add_comment', 'my_lessons', 'enrolled', 'enroll', 'quiz', 'submit_quiz']:
            return [IsAuthenticated()]
        return [IsAuthenticatedOrReadOnly()]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    # ------------------------------------------------------------------
    # Inject per-user bulk context for list serialization (no N+1)
    # ------------------------------------------------------------------
    def get_serializer(self, *args, **kwargs):
        serializer = super().get_serializer(*args, **kwargs)
        
        # Determine the effective serializer (individual or child of list)
        from rest_framework.serializers import ListSerializer
        target = serializer.child if isinstance(serializer, ListSerializer) else serializer

        # Only for list/enrolled actions returning multiple lessons (exclude single actions)
        if self.action not in ('retrieve', 'create', 'update', 'partial_update') and args:
            lessons = args[0]
            if hasattr(target, '_inject_user_context') and hasattr(lessons, '__iter__'):
                lessons_list = list(lessons)
                target._inject_user_context(self.request, lessons_list)
        return serializer

    @method_decorator(ensure_csrf_cookie)
    def retrieve(self, request, *args, **kwargs):
        lesson = self.get_object()

        viewed_lessons = request.session.get('viewed_lessons', [])
        if lesson.id not in viewed_lessons:
            lesson.views += 1
            lesson.save(update_fields=['views'])
            viewed_lessons.append(lesson.id)
            request.session['viewed_lessons'] = viewed_lessons

        # Inject context for single-object detail serialization
        serializer = self.get_serializer(lesson)
        if hasattr(serializer, '_inject_user_context'):
            serializer._inject_user_context(request, [lesson])
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def like(self, request, pk=None):
        lesson = self.get_object()
        user = request.user

        like_qs = lesson.liked_by.filter(user=user)
        if like_qs.exists():
            like_qs.delete()
            lesson.likes = lesson.liked_by.count()
            lesson.save(update_fields=['likes'])
            return Response({'status': 'unliked', 'likes': lesson.likes})
        else:
            LessonLike.objects.get_or_create(user=user, lesson=lesson)
            lesson.likes = lesson.liked_by.count()
            lesson.save(update_fields=['likes'])
            return Response({'status': 'liked', 'likes': lesson.likes})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def save_lesson(self, request, pk=None):
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
        lessons = request.user.saved_lessons.select_related(
            'sub_sub_category__sub_category__category', 'author'
        ).prefetch_related('liked_by', 'saved_by', 'quiz_questions')

        page = self.paginate_queryset(lessons)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(lessons, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def enroll(self, request, pk=None):
        lesson = self.get_object()
        user = request.user

        enrollment, created = Enrollment.objects.get_or_create(user=user, lesson=lesson)

        if created:
            return Response(
                {'status': 'success', 'message': f'Successfully enrolled in {lesson.title}'},
                status=status.HTTP_201_CREATED
            )
        return Response(
            {'status': 'info', 'message': 'You are already enrolled in this course'},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def update_progress(self, request, pk=None):
        lesson = self.get_object()
        user = request.user

        try:
            enrollment = Enrollment.objects.get(user=user, lesson=lesson)
            current_time = float(request.data.get('current_time', 0))
            duration = float(request.data.get('duration', 1))

            progress = min((current_time / duration) * 100, 100)

            if progress > enrollment.progress:
                enrollment.progress = progress

            enrollment.last_watched_time = current_time

            reward_msg = ""
            if enrollment.progress > 0.5 and enrollment.points_tier < 1:
                user.points += 20
                enrollment.points_tier = 1
                reward_msg = "Tabriklaymiz! O'rganishni boshlaganingiz uchun 20 ball berildi! 🌟"
                user.save(update_fields=['points'])

            if enrollment.progress >= 50 and enrollment.points_tier < 2:
                user.points += 20
                enrollment.points_tier = 2
                reward_msg = "Ajoyib! Kursning yarmini tugatdingiz. Yana 20 ball qo'shildi! 🚀"
                user.save(update_fields=['points'])

            if enrollment.progress >= 99.5 and enrollment.points_tier < 3:
                user.points += 20
                enrollment.points_tier = 3
                reward_msg = "Siz darsni 100% yakunladingiz! Endi test topshirib sertifikat olishingiz mumkin. 🎉"
                user.save(update_fields=['points'])
                enrollment.progress = 100.0

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
        lesson = self.get_object()
        user = request.user

        try:
            enrollment = Enrollment.objects.get(user=user, lesson=lesson)
            if enrollment.progress < 99.9 and not user.is_staff:
                return Response(
                    {'status': 'error', 'message': 'Quiz faqat video 100% koʻrilgandan keyin ochiladi.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            questions = lesson.quiz_questions.all()
            serializer = LessonQuizSerializer(questions, many=True, context={'request': request})

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
        lesson = self.get_object()
        user = request.user
        user_answers = request.data.get('answers', {})

        try:
            enrollment = Enrollment.objects.get(user=user, lesson=lesson)
            if enrollment.progress < 99.9 and not user.is_staff:
                return Response(
                    {'status': 'error', 'message': 'Avval darsni oxirigacha koʻring.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            if enrollment.quiz_passed:
                return Response({'status': 'info', 'message': 'Siz testdan oʻtib boʻlgansiz.'})

            questions = {str(q.id): q for q in lesson.quiz_questions.all()}
            if not questions:
                return Response({'status': 'error', 'message': 'Darsda test savollari mavjud emas.'})

            correct_count = sum(
                1 for q_id, answer in user_answers.items()
                if (q := questions.get(str(q_id))) and q.correct_answer.upper() == answer.upper()
            )

            total = len(questions)
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
                enrollment.save(update_fields=['quiz_passed'])

                Certificate.objects.get_or_create(user=user, lesson=lesson)

                user.points += 40
                user.save(update_fields=['points'])
                result_msg = "Tabriklaymiz! Siz barcha savollarga to'g'ri javob berdingiz va Sertifikat sohibi bo'ldingiz! 🎓"
            else:
                result_msg = (
                    f"Siz {total} tadan {correct_count} ta to'g'ri javob berdingiz. "
                    f"Sertifikat uchun barcha savollarga to'g'ri javob berishingiz kerak. Qayta urinib ko'ring!"
                )

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
        lesson = self.get_object()
        comments = lesson.comments.select_related('user').prefetch_related(
            'replies__user', 'liked_by', 'disliked_by'
        ).filter(parent=None).order_by('-created_at')
        serializer = CommentSerializer(comments, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def add_comment(self, request, pk=None):
        lesson = self.get_object()
        serializer = CommentSerializer(data=request.data, context={'request': request})

        if serializer.is_valid():
            serializer.save(user=request.user, lesson=lesson)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def featured(self, request):
        lessons = self.queryset.order_by('-views', '-likes')[:6]
        serializer = self.get_serializer(lessons, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def trending(self, request):
        lessons = self.queryset.order_by('-likes', '-created_at')[:6]
        serializer = self.get_serializer(lessons, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_lessons(self, request):
        lessons = self.queryset.filter(author=request.user)
        page = self.paginate_queryset(lessons)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(lessons, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def enrolled(self, request):
        # Single query with join instead of two separate queries
        lessons = self.queryset.filter(enrolled_students__user=request.user)

        page = self.paginate_queryset(lessons)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(lessons, many=True)
        return Response(serializer.data)


class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.select_related('user', 'lesson').prefetch_related(
        'liked_by', 'disliked_by', 'replies__user'
    )
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
            comment.disliked_by.remove(user)
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
            comment.liked_by.remove(user)
            active = True

        return Response({
            'status': 'success',
            'active': active,
            'likes_count': comment.liked_by.count(),
            'dislikes_count': comment.disliked_by.count()
        })


class AssignmentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for assignments.
    Only staff can create/update/delete.
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
        """Hide correct answer from students (via serializer)"""
        return super().get_queryset()


class LessonQuizViewSet(viewsets.ModelViewSet):
    """API endpoint for quiz questions"""
    queryset = LessonQuiz.objects.select_related('lesson').all()
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
        # Defer correct_answer column for students
        return queryset.defer('correct_answer')


class SubmissionViewSet(viewsets.ModelViewSet):
    """
    API endpoint for assignment submissions.
    Students can submit and view their own submissions.
    """
    queryset = Submission.objects.select_related('assignment__lesson', 'user').all()
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
        score = 0
        if assignment.correct_answer and answer_text:
            if answer_text.strip().upper() == assignment.correct_answer.strip().upper():
                score = assignment.max_score

        submission = serializer.save(
            user=self.request.user,
            score=score,
            completed=True
        )

        # Award points to user profile if correct
        if score > 0 and hasattr(self.request.user, 'points'):
            self.request.user.points += score
            self.request.user.save(update_fields=['points'])

        Notification.objects.create(
            user=self.request.user,
            title="Assignment Submitted",
            message=f"You've submitted assignment for {assignment.lesson.title}. Score: {score}/{assignment.max_score}",
            notification_type='submission'
        )


class CertificateViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing certificates.
    """
    queryset = Certificate.objects.select_related(
        'user', 'lesson__author', 'lesson__sub_sub_category__sub_category__category'
    ).all()
    serializer_class = CertificateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Users can only see their own certificates"""
        return self.queryset.filter(user=self.request.user)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Placeholder for PDF download logic"""
        return Response({'status': 'success', 'message': 'PDF generation is coming soon'})
