from rest_framework import serializers
from community.models import BookReview, Article, Announcement
from courses.serializers import UserBasicSerializer

class BookReviewSerializer(serializers.ModelSerializer):
    author = UserBasicSerializer(source='user', read_only=True)
    cover_image_url = serializers.SerializerMethodField()

    class Meta:
        model = BookReview
        fields = [
            'id', 'author', 'book_title', 'book_author', 'review_content',
            'rating', 'cover_image', 'cover_image_url', 'created_at'
        ]
        read_only_fields = ['author', 'created_at']

    def get_cover_image_url(self, obj):
        if obj.cover_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.cover_image.url)
        return None

class ArticleSerializer(serializers.ModelSerializer):
    author_info = UserBasicSerializer(source='author', read_only=True)
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = Article
        fields = [
            'id', 'title', 'slug', 'content', 'author_info', 'thumbnail',
            'thumbnail_url', 'is_published', 'views', 'created_at'
        ]
        read_only_fields = ['slug', 'author_info', 'views', 'created_at']

    def get_thumbnail_url(self, obj):
        if obj.thumbnail:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.thumbnail.url)
        return None

class AnnouncementSerializer(serializers.ModelSerializer):
    organizer_info = UserBasicSerializer(source='organizer', read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = [
            'id', 'title', 'description', 'image', 'image_url', 'location',
            'event_date', 'organizer_info', 'is_active', 'created_at'
        ]
        read_only_fields = ['organizer_info', 'created_at']

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
        return None
