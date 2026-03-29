import os
from django.contrib import admin

from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.sitemaps.views import sitemap
from django.views.generic import TemplateView
from django.views.static import serve
from django.shortcuts import render
import posixpath
from pathlib import Path

from courses.sitemaps import LessonSitemap, CategorySitemap, StaticViewSitemap

sitemaps = {
    'lessons': LessonSitemap,
    'categories': CategorySitemap,
    'static': StaticViewSitemap,
}

def serve_react(request, path=''):
    if path.startswith('api/') or path.startswith('admin/') or path.startswith('media/') or path.startswith('static/'):
        return None 
    
    return render(request, 'index.html')

urlpatterns = [
    path(os.getenv('ADMIN_URL', 'admin/'), admin.site.urls),
    path('accounts/', include('allauth.urls')),
    
    path('api/', include('courses.api_urls')),
    path('api/accounts/', include('accounts.urls')),
    path('api/community/', include('community.urls')),
    path('api/ai-chat/', __import__('core.views', fromlist=['ai_chat']).ai_chat, name='ai-chat'),
    path('api/stats/', __import__('core.views', fromlist=['api_stats']).api_stats, name='api-stats'),
    path('api/team/', __import__('core.views', fromlist=['api_team']).api_team, name='api-team'),
    path('api-auth/', include('rest_framework.urls')),

    path('sitemap.xml', sitemap, {'sitemaps': sitemaps}, name='django.contrib.sitemaps.views.sitemap'),
    path('robots.txt', TemplateView.as_view(template_name="robots.txt", content_type="text/plain")),

    re_path(r'^(?!api|edushare-boshqaruv-2026|admin|media|static|accounts|sitemap\.xml|robots\.txt).*$', 
           TemplateView.as_view(template_name='index.html'), name='react-app'),

    # 📁 Legacy Django Views (Faqat 'reverse' ishlashi uchun qoldirildi)
    path('courses/', include('courses.urls')),
    path('core/', include('core.urls')),
    
]

if settings.DEBUG:
    from core.media_view import protected_media
    
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', protected_media),
    ]
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
else:
    from core.media_view import protected_media
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', protected_media),
    ]