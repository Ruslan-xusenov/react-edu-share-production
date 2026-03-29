from django.urls import path, include
from rest_framework.routers import DefaultRouter
from community.api_views import BookReviewViewSet, ArticleViewSet, AnnouncementViewSet

app_name = 'community'

router = DefaultRouter()
router.register(r'book-reviews', BookReviewViewSet, basename='book-review')
router.register(r'articles', ArticleViewSet, basename='article')
router.register(r'announcements', AnnouncementViewSet, basename='announcement')

urlpatterns = [
    path('', include(router.urls)),
]
