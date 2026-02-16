from django.urls import path, include
from rest_framework.routers import DefaultRouter
from courses.api_views import (
    CategoryViewSet, SubCategoryViewSet, LessonViewSet, CommentViewSet,
    AssignmentViewSet, SubmissionViewSet, CertificateViewSet, LessonQuizViewSet
)

app_name = 'api'

# Create router and register viewsets
router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'subcategories', SubCategoryViewSet, basename='subcategory')
router.register(r'lessons', LessonViewSet, basename='lesson')
router.register(r'comments', CommentViewSet, basename='comment')
router.register(r'assignments', AssignmentViewSet, basename='assignment')
router.register(r'quiz-questions', LessonQuizViewSet, basename='quiz-question')
router.register(r'submissions', SubmissionViewSet, basename='submission')
router.register(r'certificates', CertificateViewSet, basename='certificate')

urlpatterns = [
    path('', include(router.urls)),
]