from django.contrib.sitemaps import Sitemap
from django.urls import reverse
from .models import Lesson, Category


class LessonSitemap(Sitemap):
    changefreq = "weekly"
    priority = 0.9
    protocol = 'https'

    def items(self):
        return Lesson.objects.filter(is_published=True).order_by('-created_at')

    def lastmod(self, obj):
        return obj.updated_at

    def location(self, obj):
        return f'/courses/lesson/{obj.id}/'


class CategorySitemap(Sitemap):
    changefreq = "monthly"
    priority = 0.7
    protocol = 'https'

    def items(self):
        return Category.objects.all()

    def location(self, obj):
        return f'/courses/category/{obj.id}/'


class StaticViewSitemap(Sitemap):
    priority = 0.8
    changefreq = 'daily'
    protocol = 'https'

    def items(self):
        return [
            '/',              # Home
            '/about',         # About
            '/courses',       # Courses list
            '/leaderboard',   # Leaderboard
        ]

    def location(self, item):
        return item
