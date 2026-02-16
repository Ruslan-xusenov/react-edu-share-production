from core.models import Notification

def notifications_processor(request):
    if request.user.is_authenticated:
        unread_notifications = Notification.objects.filter(user=request.user, is_read=False)[:5]
        unread_count = Notification.objects.filter(user=request.user, is_read=False).count()
        return {
            'unread_notifications': unread_notifications,
            'unread_count': unread_count
        }
    return {}
