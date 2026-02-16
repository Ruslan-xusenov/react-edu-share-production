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
    """User agent ni qisqartirish - DB overflow oldini olish"""
    if len(user_agent) > 500:
        return user_agent[:500] + '...'
    return user_agent


@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    """Foydalanuvchi tizimga kirganini logga yozish"""
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
    """Foydalanuvchi tizimdan chiqqanini logga yozish"""
    try:
        if user:  # user None bo'lishi mumkin agar session o'chirilgan bo'lsa
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
    """Yangi foydalanuvchi ro'yxatdan o'tganini logga yozish"""
    try:
        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        parsed_ua = parse_user_agent(user_agent)
        
        # Registratsiya manbasini aniqlash
        sociallogin = kwargs.get('sociallogin', None)
        if sociallogin:
            # Google orqali registratsiya
            provider = sociallogin.account.provider
            description = f"Google orqali registratsiya ({provider})"
        else:
            # Oddiy email/password registratsiya
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
            error_message=description  # Bu yerda description sifatida ishlatamiz
        )
    except Exception as e:
        logger.error(f"Error logging user registration: {e}", exc_info=True)


# Muvaffaqiyatsiz login urinishlarini kuzatish uchun
# django-axes already does this, but we can add custom logging
from axes.signals import user_locked_out

@receiver(user_locked_out)
def log_user_lockout(sender, request, username, ip_address, **kwargs):
    """Foydalanuvchi bloklanganini logga yozish"""
    try:
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        parsed_ua = parse_user_agent(user_agent)
        
        # Foydalanuvchini topishga urinish
        try:
            user = User.objects.get(email=username)
        except User.DoesNotExist:
            user = None
        except User.MultipleObjectsReturned:
            # Agar bir nechta foydalanuvchi topilsa (bo'lmasligi kerak)
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
