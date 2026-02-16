from django.contrib.sitemaps import Sitemap
from django.urls import reverse
from .models import Lesson, Category

class LessonSitemap(Sitemap):
    changefreq = "weekly"
    priority = 0.9

    def items(self):
        return Lesson.objects.filter(is_published=True).order_by('-created_at')

    def lastmod(self, obj):
        return obj.updated_at

class CategorySitemap(Sitemap):
    changefreq = "monthly"
    priority = 0.7

    def items(self):
        return Category.objects.all()

    def location(self, obj):
        return reverse('courses:category_detail', args=[obj.id])

class StaticViewSitemap(Sitemap):
    priority = 0.5
    changefreq = 'daily'

    def items(self):
        return ['core:home', 'core:about', 'courses:course_list']

    def location(self, item):
        return reverse(item)
