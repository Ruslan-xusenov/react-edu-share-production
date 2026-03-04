from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from allauth.account.signals import user_signed_up
from .models import UserActivityLog
from .middleware import parse_user_agent
from .security_utils import get_client_ip
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


def _truncate_user_agent(user_agent):
    if len(user_agent) > 500:
        return user_agent[:500] + '...'
    return user_agent


@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    try:
        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        parsed_ua = parse_user_agent(user_agent)
        
        UserActivityLog.objects.create(
            user=user,
            activity_type='login',
            ip_address=ip_address,
            user_agent=_truncate_user_agent(user_agent),
            device_type=parsed_ua['device_type'],
            browser=parsed_ua['browser'],
            os=parsed_ua['os'],
            success=True
        )
    except Exception as e:
        logger.error(f"Error logging user login: {e}", exc_info=True)


@receiver(user_logged_out)
def log_user_logout(sender, request, user, **kwargs):
    try:
        if user:
            ip_address = get_client_ip(request)
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            parsed_ua = parse_user_agent(user_agent)
            
            UserActivityLog.objects.create(
                user=user,
                activity_type='logout',
                ip_address=ip_address,
                user_agent=_truncate_user_agent(user_agent),
                device_type=parsed_ua['device_type'],
                browser=parsed_ua['browser'],
                os=parsed_ua['os'],
                success=True
            )
    except Exception as e:
        logger.error(f"Error logging user logout: {e}", exc_info=True)


@receiver(user_signed_up)
def log_user_registration(sender, request, user, **kwargs):
    try:
        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        parsed_ua = parse_user_agent(user_agent)
        
        sociallogin = kwargs.get('sociallogin', None)
        if sociallogin:
            provider = sociallogin.account.provider
            description = f"Google orqali registratsiya ({provider})"
        else:
            description = "Email/Password orqali registratsiya"
        
        UserActivityLog.objects.create(
            user=user,
            activity_type='registration',
            ip_address=ip_address,
            user_agent=_truncate_user_agent(user_agent),
            device_type=parsed_ua['device_type'],
            browser=parsed_ua['browser'],
            os=parsed_ua['os'],
            success=True,
            error_message=description
        )
    except Exception as e:
        logger.error(f"Error logging user registration: {e}", exc_info=True)

from axes.signals import user_locked_out

@receiver(user_locked_out)
def log_user_lockout(sender, request, username, ip_address, **kwargs):
    try:
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        parsed_ua = parse_user_agent(user_agent)
        
        try:
            user = User.objects.get(email=username)
        except User.DoesNotExist:
            user = None
        except User.MultipleObjectsReturned:
            user = User.objects.filter(email=username).first()
            logger.warning(f"Multiple users found with email: {username}")
        
        UserActivityLog.objects.create(
            user=user,
            activity_type='failed_login',
            ip_address=ip_address,
            user_agent=_truncate_user_agent(user_agent),
            device_type=parsed_ua['device_type'],
            browser=parsed_ua['browser'],
            os=parsed_ua['os'],
            success=False,
            error_message=f"Bloklandi - {username[:50]} uchun 5+ marta noto'g'ri parol"  # Truncate username
        )
    except Exception as e:
        logger.error(f"Error logging user lockout: {e}", exc_info=True)