from rest_framework import viewsets, filters, permissions, status
from django.shortcuts import get_object_or_404
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from community.models import BookReview, Article, Announcement
from community.serializers import (
    BookReviewSerializer, ArticleSerializer, AnnouncementSerializer
)

class IsAdminOrVolunteer(permissions.BasePermission):
    """Allow access to staff, superusers, or users marked as volunteers"""
    def has_permission(self, request, view):
        if request.user and request.user.is_authenticated:
            return request.user.is_superuser or request.user.is_staff or getattr(request.user, 'is_volunteer', False)
        return False

class IsOwnerOrAdmin(permissions.BasePermission):
    """Allow access to owner or admin (staff/superuser)"""
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        if request.user.is_superuser or request.user.is_staff:
            return True
        # For BookReview, check 'user' field
        if hasattr(obj, 'user'):
            return obj.user == request.user
        # For Article/Announcement, check 'author' or 'organizer'
        author = getattr(obj, 'author', getattr(obj, 'organizer', None))
        return author == request.user

class BookReviewViewSet(viewsets.ModelViewSet):
    queryset = BookReview.objects.select_related('user').all()
    serializer_class = BookReviewSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['user', 'rating']
    search_fields = ['book_title', 'book_author', 'review_content']
    ordering_fields = ['created_at', 'rating']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.IsAuthenticated()]
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsOwnerOrAdmin()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class ArticleViewSet(viewsets.ModelViewSet):
    queryset = Article.objects.select_related('author').all()
    serializer_class = ArticleSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'content']
    ordering_fields = ['created_at', 'views']
    ordering = ['-created_at']

    def get_object(self):
        """Try up to look up by PK, then fallback to slug"""
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs[lookup_url_kwarg]
        
        # 1. Try finding by ID (PK) first
        if str(lookup_value).isdigit():
            try:
                return get_object_or_404(queryset, pk=lookup_value)
            except:
                pass # ID not found, try slug
        
        # 2. Try finding by slug
        return get_object_or_404(queryset, slug=lookup_value)

    def get_queryset(self):
        queryset = Article.objects.select_related('author').all()
        user = self.request.user
        
        # Admin va Valantyyorlar hamma narsani ko'rishadi (draftlarni ham)
        if user and user.is_authenticated and (user.is_staff or getattr(user, 'is_volunteer', False)):
            return queryset
            
        # Oddiy foydalanuvchilar faqat chop etilganlarini ko'rishadi
        # Agarda malumotlar chiqmayotgan bo'lsa, demak bazada is_published=False bo'lib qolgan
        # Hozircha testi uchun hamma maqolani qaytaramiz
        return queryset


    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrVolunteer()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['get'])
    def increment_views(self, request, slug=None):
        article = self.get_object()
        article.views += 1
        article.save(update_fields=['views'])
        return Response({'status': 'view incremented', 'views': article.views})

class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset = Announcement.objects.select_related('organizer').all()
    serializer_class = AnnouncementSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['location']
    search_fields = ['title', 'description', 'location']
    ordering_fields = ['created_at', 'event_date']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = Announcement.objects.select_related('organizer').all()
        user = self.request.user
        
        if user and user.is_authenticated and (user.is_staff or getattr(user, 'is_volunteer', False)):
            return queryset
            
        # Agarda malumotlar chiqmayotgan bo'lsa, hozircha hamma e'lonni ko'rsatish
        return queryset


    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrVolunteer()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        serializer.save(organizer=self.request.user)
