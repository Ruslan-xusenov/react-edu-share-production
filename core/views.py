from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from .models import Notification
from accounts.models import CustomUser
from django.db.models import Count
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from courses.models import Category, Lesson, Certificate

def home(request):
    categories = Category.objects.all()
    recent_lessons = Lesson.objects.filter(is_published=True).order_by('-created_at')[:6]
    popular_lessons = Lesson.objects.filter(is_published=True).order_by('-views', '-likes')[:6]
    
    context = {
        'categories': categories,
        'recent_lessons': recent_lessons,
        'popular_lessons': popular_lessons,
        'total_lessons': Lesson.objects.all().count(),
        'total_users': CustomUser.objects.all().count(),
        'total_certificates': Certificate.objects.all().count(),
    }
    return render(request, 'core/home.html', context)

def about(request):
    total_lessons = Lesson.objects.filter(is_published=True).count()
    total_users = CustomUser.objects.count()
    total_certificates = Certificate.objects.count()
    
    context = {
        'total_lessons': total_lessons,
        'total_users': total_users,
        'total_certificates': total_certificates,
    }
    return render(request, 'core/about.html', context)

def leaderboard(request):
    top_contributors = CustomUser.objects.filter(is_superuser=False).order_by('-points')[:20]
    
    context = {
        'top_contributors': top_contributors,
    }
    return render(request, 'core/leaderboard.html', context)

@login_required
def notifications_view(request):
    """View all notifications for the user"""
    notifications = Notification.objects.filter(user=request.user)
    notifications.filter(is_read=False).update(is_read=True)
    return render(request, 'core/notifications.html', {'notifications': notifications})

@login_required
def mark_notification_read(request, notification_id):
    notification = get_object_or_404(Notification, id=notification_id, user=request.user)
    notification.is_read = True
    notification.save()
    if notification.link:
        return redirect(notification.link)
    return redirect('core:notifications')
@csrf_exempt
def api_stats(request):
    """API endpoint for platform statistics"""
    return JsonResponse({
        'status': 'success',
        'stats': {
            'students': CustomUser.objects.count(),
            'courses': Category.objects.count(),
            'lessons': Lesson.objects.count(),
            'instructors': CustomUser.objects.filter(is_staff=True).count(),
            'certificates': Certificate.objects.count(),
        }
    })
