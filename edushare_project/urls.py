"""
URL configuration for edushare_project project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
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

# Catch-all view for React SPA
def serve_react(request, path=''):
    if path.startswith('api/') or path.startswith('admin/') or path.startswith('media/') or path.startswith('static/'):
        # This shouldn't happen if URLs are configured correctly, but as a safety:
        return None 
    
    # Serve index.html from frontend/dist
    # or use TemplateView if it's in templates
    return render(request, 'index.html')

urlpatterns = [
    path(os.getenv('ADMIN_URL', 'admin/'), admin.site.urls),
    path('accounts/', include('allauth.urls')),
    path('courses/', include('courses.urls')),
    path('profile/', include('accounts.urls')),
    
    # API endpoints
    path('api/', include('courses.api_urls')),
    path('api/accounts/', include('accounts.urls')),
    path('api-auth/', include('rest_framework.urls')),
    
    path('', include('core.urls')),

    # SEO
    path('sitemap.xml', sitemap, {'sitemaps': sitemaps}, name='django.contrib.sitemaps.views.sitemap'),
    path('robots.txt', TemplateView.as_view(template_name="robots.txt", content_type="text/plain")),
    
    # React App Catch-all
    # path('', TemplateView.as_view(template_name='index.html'), name='index'),
    # Use re_path to catch all sub-routes for React Router
    re_path(r'^(?!api|admin|media|static|accounts|sitemap.xml|robots.txt).*$', TemplateView.as_view(template_name='index.html')),
]

if settings.DEBUG:
    # Use protected media view even in DEBUG mode to test the protection
    from core.media_view import protected_media
    
    # urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', protected_media),
    ]
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
else:
    # In production, serve media through protected view as well
    from core.media_view import protected_media
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', protected_media),
    ]
