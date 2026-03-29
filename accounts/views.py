from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.views.decorators.http import require_POST, require_GET
from django.http import JsonResponse
from django.utils.html import escape
import json
import re
import logging
from .models import CustomUser
from .forms import ProfileForm

logger = logging.getLogger(__name__)

def _validate_email(email):
    if not email or not isinstance(email, str):
        return False
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email)) and len(email) <= 254

def _validate_password(password):
    if not password or not isinstance(password, str):
        return False, "Parol bo'sh bo'lishi mumkin emas."
    if len(password) < 10:
        return False, "Parol kamida 10 ta belgidan iborat bo'lishi kerak."
    if len(password) > 128:
        return False, "Parol juda uzun."
    if not re.search(r'[A-Z]', password):
        return False, "Parolda kamida bitta katta harf bo'lishi kerak."
    if not re.search(r'[a-z]', password):
        return False, "Parolda kamida bitta kichik harf bo'lishi kerak."
    if not re.search(r'\d', password):
        return False, "Parolda kamida bitta raqam bo'lishi kerak."
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Parolda kamida bitta maxsus belgi bo'lishi kerak (!@#$%^&*...)."
    return True, ""

def _sanitize_text(text, max_length=500):
    if not text or not isinstance(text, str):
        return ""
    text = text.strip()
    text = escape(text)
    return text[:max_length]

def _safe_json_parse(request):
    try:
        if not request.body:
            return None, "So'rov tanasi bo'sh."
        if len(request.body) > 10240:
            return None, "So'rov tanasi juda katta."
        return json.loads(request.body), None
    except json.JSONDecodeError:
        return None, "Noto'g'ri JSON format."

@login_required
def profile(request):
    user = request.user
    context = {
        'user': user,
    }
    return render(request, 'accounts/profile.html', context)


@login_required
def edit_profile(request):
    if request.method == 'POST':
        form = ProfileForm(request.POST, request.FILES, instance=request.user)
        if form.is_valid():
            form.save()
            messages.success(request, 'Profile updated successfully!')
            return redirect('accounts:profile')
    else:
        form = ProfileForm(instance=request.user)
    
    context = {
        'form': form,
    }
    return render(request, 'accounts/edit_profile.html', context)

@csrf_exempt
def api_profile(request):
    if request.method != 'GET':
        return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)
    if not request.user.is_authenticated:
        return JsonResponse({'status': 'error', 'message': 'Not authenticated'}, status=401)
    user = request.user
    avatar_url = user.avatar.url if user.avatar else f"https://ui-avatars.com/api/?name={user.full_name}&background=f3f4f6&color=6366f1"
    if user.avatar:
        avatar_url = request.build_absolute_uri(user.avatar.url)

    return JsonResponse({
        'status': 'success',
        'user': {
            'id': user.id,
            'email': user.email,
            'full_name': user.full_name,
            'username': user.username,
            'points': user.points,
            'is_staff': user.is_staff,
            'bio': user.bio,
            'school': user.school,
            'grade': user.grade,
            'phone_number': user.phone_number,
            'interests': user.interests,
            'avatar': avatar_url,
            'date_joined': user.date_joined.strftime('%B %Y'),
            'certificates_count': user.get_completed_courses_count(),
            'lessons_count': user.get_created_lessons_count(),
            'has_password': user.has_usable_password(),
            'is_social': user.socialaccount_set.exists(),
        }
    })


@csrf_exempt
def api_leaderboard(request):
    if request.method != 'GET':
        return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)
    top_users = CustomUser.objects.filter(is_superuser=False).order_by('-points')[:10]
    users_data = []
    for user in top_users:
        users_data.append({
            'id': user.id,
            'full_name': user.full_name,
            'username': user.username,
            'points': user.points,
            'avatar': user.avatar.url if user.avatar else None,
        })
    return JsonResponse({
        'status': 'success',
        'results': users_data
    })


def user_profile(request, user_id):
    user = get_object_or_404(CustomUser, id=user_id)
    context = {
        'profile_user': user,
    }
    return render(request, 'accounts/profile.html', context)


from django.contrib.auth import authenticate, login

@csrf_exempt
def api_login(request):
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)
    
    try:
        data, error = _safe_json_parse(request)
        if error:
            return JsonResponse({'status': 'error', 'message': error}, status=400)
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return JsonResponse({'status': 'error', 'message': 'Email va parol kiritilishi shart.'}, status=400)
        
        if not _validate_email(email):
            return JsonResponse({'status': 'error', 'message': "Noto'g'ri email format."}, status=400)
        
        user = authenticate(request, username=email, password=password)
        if user:
            login(request, user)
            logger.info(f"User logged in: {user.email} from IP: {_get_client_ip(request)}")
            return JsonResponse({
                'status': 'success', 
                'user': {
                    'id': user.id,
                    'email': user.email, 
                    'full_name': user.full_name,
                    'username': user.username,
                    'is_staff': user.is_superuser
                }
            })
        
        logger.warning(f"Failed login attempt for: {email} from IP: {_get_client_ip(request)}")
        return JsonResponse({'status': 'error', 'message': "Email yoki parol noto'g'ri."}, status=400)
    
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return JsonResponse({'status': 'error', 'message': "Ichki xatolik. Qayta urinib ko'ring."}, status=500)

@csrf_exempt
def api_signup(request):
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)
    
    try:
        data, error = _safe_json_parse(request)
        if error:
            return JsonResponse({'status': 'error', 'message': error}, status=400)
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        full_name = _sanitize_text(data.get('full_name', ''), max_length=150)
        
        if not _validate_email(email):
            return JsonResponse({'status': 'error', 'message': "Noto'g'ri email format."}, status=400)
        
        is_valid, pwd_error = _validate_password(password)
        if not is_valid:
            return JsonResponse({'status': 'error', 'message': pwd_error}, status=400)
        
        username = data.get('username', '')
        if not username and email:
            username = re.sub(r'[^a-zA-Z0-9_]', '', email.split('@')[0])
        username = re.sub(r'[^a-zA-Z0-9_]', '', username)[:30]
        
        if not username:
            username = 'user'
        
        import random
        base_username = username
        while CustomUser.objects.filter(username=username).exists():
            username = f"{base_username}{random.randint(100, 9999)}"

        if not full_name:
            full_name = username
        
        if CustomUser.objects.filter(email=email).exists():
            return JsonResponse({'status': 'error', 'message': 'Bu email allaqachon ro\'yxatdan o\'tgan.'}, status=400)
        
        user = CustomUser.objects.create_user(
            username=username,
            email=email,
            password=password,
            full_name=full_name
        )
        login(request, user, backend='django.contrib.auth.backends.ModelBackend')
        
        logger.info(f"New user registered: {user.email} from IP: {_get_client_ip(request)}")
        
        return JsonResponse({
            'status': 'success',
            'user': {
                'id': user.id,
                'email': user.email,
                'full_name': user.full_name,
                'username': user.username,
                'is_staff': user.is_superuser
            }
        })
    except Exception as e:
        logger.error(f"Signup error: {str(e)}")
        return JsonResponse({'status': 'error', 'message': "Ro'yxatdan o'tishda xatolik. Qayta urinib ko'ring."}, status=500)

@csrf_exempt
def api_update_profile(request):
    if not request.user.is_authenticated:
        return JsonResponse({'status': 'error', 'message': 'Not authenticated'}, status=401)
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)
    
    try:
        user = request.user
        if request.content_type and request.content_type.startswith('multipart/form-data'):
            data = request.POST
            if 'avatar' in request.FILES:
                avatar_file = request.FILES['avatar']
                if avatar_file.size > 5 * 1024 * 1024:
                    return JsonResponse({'status': 'error', 'message': "Rasm hajmi 5MB dan kichik bo'lishi kerak."}, status=400)
                allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
                if avatar_file.content_type not in allowed_types:
                    return JsonResponse({'status': 'error', 'message': "Faqat JPG, PNG, GIF, WEBP rasmlar."}, status=400)
                import os
                ext = os.path.splitext(avatar_file.name)[1].lower()
                if ext not in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
                    return JsonResponse({'status': 'error', 'message': "Noto'g'ri fayl formati."}, status=400)
                user.avatar = avatar_file
        else:
            data, error = _safe_json_parse(request)
            if error:
                return JsonResponse({'status': 'error', 'message': error}, status=400)
        
        if 'full_name' in data:
            name = _sanitize_text(data['full_name'], max_length=150)
            if not name:
                return JsonResponse({'status': 'error', 'message': "Ism bo'sh bo'lishi mumkin emas."}, status=400)
            user.full_name = name
            
        if 'school' in data:
            user.school = _sanitize_text(data['school'], max_length=200)
        if 'grade' in data:
            user.grade = _sanitize_text(data['grade'], max_length=50)
            
        if 'phone_number' in data:
            phone = data['phone_number'].strip()
            # Lenient regex: allows +, digits, spaces, dashes, parentheses
            if phone and not re.match(r'^\+?[\d\s\-()]{7,25}$', phone):
                return JsonResponse({'status': 'error', 'message': "Telefon raqamli noto'g'ri formatda. Namuna: +998901234567"}, status=400)
            user.phone_number = phone[:20]
            
        if 'bio' in data:
            user.bio = _sanitize_text(data['bio'], max_length=1000)
            
        user.save()
        
        avatar_url = user.avatar.url if user.avatar else None
        if user.avatar:
            avatar_url = request.build_absolute_uri(user.avatar.url)

        return JsonResponse({
            'status': 'success', 
            'message': 'Profile updated successfully',
            'avatar_url': avatar_url
        })
    except Exception as e:
        logger.error(f"Profile update error for user {request.user.id}: {str(e)}")
        return JsonResponse({'status': 'error', 'message': "Profilni yangilashda xatolik."}, status=500)

@csrf_exempt
def api_change_password(request):
    if not request.user.is_authenticated:
        return JsonResponse({'status': 'error', 'message': 'Not authenticated'}, status=401)
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)
    
    try:
        data, error = _safe_json_parse(request)
        if error:
            return JsonResponse({'status': 'error', 'message': error}, status=400)
        
        user = request.user
        old_password = data.get('old_password', '')
        new_password = data.get('new_password', '')
        
        if not old_password or not new_password:
            return JsonResponse({'status': 'error', 'message': "Eski va yangi parol kiritilishi shart."}, status=400)
        
        if not user.check_password(old_password):
            logger.warning(f"Failed password change attempt for user {user.email} from IP: {_get_client_ip(request)}")
            return JsonResponse({'status': 'error', 'message': "Eski parol noto'g'ri."}, status=400)
        
        is_valid, pwd_error = _validate_password(new_password)
        if not is_valid:
            return JsonResponse({'status': 'error', 'message': pwd_error}, status=400)
        
        if old_password == new_password:
            return JsonResponse({'status': 'error', 'message': "Yangi parol eskisidan farq qilishi kerak."}, status=400)
        
        user.set_password(new_password)
        user.save()
        from django.contrib.auth import update_session_auth_hash
        update_session_auth_hash(request, user)
        
        logger.info(f"Password changed for user {user.email}")
        return JsonResponse({'status': 'success', 'message': 'Parol muvaffaqiyatli o\'zgartirildi.'})
    except Exception as e:
        logger.error(f"Password change error for user {request.user.id}: {str(e)}")
        return JsonResponse({'status': 'error', 'message': "Parolni o'zgartirishda xatolik."}, status=500)

@csrf_exempt
def api_logout(request):
    from django.contrib.auth import logout
    logout(request)
    return JsonResponse({'status': 'success'})


def _get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '0.0.0.0')


# ─────────────────────────────────────────────────────────────────────────────
# EMAIL OTP — Parolni email tasdiqi bilan almashtirish
# ─────────────────────────────────────────────────────────────────────────────

@csrf_exempt
def api_request_password_change(request):
    """
    1-QADAM: Foydalanuvchi eski parol + yangi parolni kiritadi.
    Muvaffaqiyatli bo'lsa, 6 raqamli OTP emailga yuboriladi.
    Yangi parol xesh holida OTP yozuvida saqlanadi.
    """
    if not request.user.is_authenticated:
        return JsonResponse({'status': 'error', 'message': 'Tizimga kirish talab etiladi.'}, status=401)
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)

    try:
        data, error = _safe_json_parse(request)
        if error:
            return JsonResponse({'status': 'error', 'message': error}, status=400)

        user = request.user
        old_password = data.get('old_password', '')
        new_password = data.get('new_password', '')
        has_usable_password = user.has_usable_password()
        is_social_user = user.socialaccount_set.exists()

        if not new_password:
            return JsonResponse({'status': 'error', 'message': 'Yangi parol kiritilishi shart.'}, status=400)

        # Qachon eski parolni so'raymiz:
        # 1. Userning paroli yaroqli bo'lsa (has_usable_password)
        # 2. VA user social login orqali kirmagan bo'lsa (Google orqali kirganlar parolni bilmasligi mumkin)
        # 3. YOKI social user bo'lsa ham, oldin parol o'rnatgan bo'lsa (lekin biz hozircha social userlar uchun doim bypass qilamiz)
        
        should_check_old = has_usable_password and not is_social_user

        if should_check_old:
            if not old_password:
                return JsonResponse({'status': 'error', 'message': 'Eski parol kiritilishi shart.'}, status=400)
            if not user.check_password(old_password):
                logger.warning(f"OTP request — wrong old password: {user.email}")
                return JsonResponse({'status': 'error', 'message': "Joriy parol noto'g'ri."}, status=400)
            if old_password == new_password:
                return JsonResponse({'status': 'error', 'message': 'Yangi parol eskisidan farq qilishi kerak.'}, status=400)

        is_valid, pwd_error = _validate_password(new_password)
        if not is_valid:
            return JsonResponse({'status': 'error', 'message': pwd_error}, status=400)

        # Avvalgi tugamagan OTPlarni bekor qilish (spam oldini olish)
        from accounts.models import PasswordChangeOTP
        PasswordChangeOTP.objects.filter(user=user, is_used=False).update(is_used=True)

        # Yangi parolni hesh qilish
        from django.contrib.auth.hashers import make_password
        from django.utils import timezone
        import random, string
        new_password_hash = make_password(new_password)

        # 6 raqamli OTP kodi
        otp_code = ''.join(random.choices(string.digits, k=6))
        expires_at = timezone.now() + timezone.timedelta(minutes=30)

        otp = PasswordChangeOTP.objects.create(
            user=user,
            code=otp_code,
            new_password_hash=new_password_hash,
            expires_at=expires_at,
        )

        # Email yuborish
        _send_password_otp_email(user, otp_code)

        logger.info(f"Password change OTP sent to {user.email}")
        return JsonResponse({
            'status': 'success',
            'message': f"Tasdiqlash kodi {user.email} manziliga yuborildi. 30 daqiqa ichida tasdiqlang.",
            'otp_id': otp.id,
            'email_hint': f"{user.email[:3]}***{user.email[user.email.index('@') if '@' in user.email else 0:]}"
        })

    except Exception as e:
        logger.error(f"Password OTP request error: {str(e)}")
        # Email xatosi bo'lsa, aniqroq aytamiz
        msg = "Xatolik yuz berdi. Qayta urinib ko'ring."
        if "SMTP" in str(e) or "authentication" in str(e).lower():
            msg = "Email yuborishda xatolik (SMTP). Sozlamalarni tekshiring."
        return JsonResponse({'status': 'error', 'message': msg}, status=500)


@csrf_exempt
def api_verify_password_otp(request):
    """
    2-QADAM: Foydalanuvchi emaildan kelgan OTP kodni kiritadi.
    To'g'ri bo'lsa, yangi parol o'rnatiladi.
    """
    if not request.user.is_authenticated:
        return JsonResponse({'status': 'error', 'message': 'Tizimga kirish talab etiladi.'}, status=401)
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)

    try:
        data, error = _safe_json_parse(request)
        if error:
            return JsonResponse({'status': 'error', 'message': error}, status=400)

        otp_id = data.get('otp_id')
        entered_code = str(data.get('code', '')).strip()

        if not otp_id or not entered_code:
            return JsonResponse({'status': 'error', 'message': "OTP ID va kod kiritilishi shart."}, status=400)

        from accounts.models import PasswordChangeOTP

        try:
            otp = PasswordChangeOTP.objects.get(id=otp_id, user=request.user)
        except PasswordChangeOTP.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': "Tasdiqlash kodi topilmadi."}, status=404)

        if otp.is_used:
            return JsonResponse({'status': 'error', 'message': "Bu tasdiqlash kodi allaqachon ishlatilgan."}, status=400)

        from django.utils import timezone
        if otp.expires_at <= timezone.now():
            return JsonResponse({
                'status': 'error',
                'message': "Tasdiqlash kodining muddati tugagan. Qayta so'rang.",
                'expired': True
            }, status=400)

        if otp.attempts >= 5:
            otp.is_used = True
            otp.save(update_fields=['is_used'])
            return JsonResponse({
                'status': 'error',
                'message': "Juda ko'p noto'g'ri urinish. Yangi kod so'rang.",
                'expired': True
            }, status=400)

        # Kodni tekshirish
        if otp.code != entered_code:
            otp.attempts += 1
            otp.save(update_fields=['attempts'])
            remaining = 5 - otp.attempts
            return JsonResponse({
                'status': 'error',
                'message': f"Noto'g'ri kod. {remaining} ta urinish qoldi."
            }, status=400)

        # ✅ OTP to'g'ri — parolni o'zgartirish
        user = request.user
        from django.contrib.auth.hashers import check_password
        user.password = otp.new_password_hash
        user.save(update_fields=['password'])

        otp.is_used = True
        otp.save(update_fields=['is_used'])

        # Sessiyani saqlash (logout qilmaslik)
        from django.contrib.auth import update_session_auth_hash
        update_session_auth_hash(request, user)

        logger.info(f"Password successfully changed via OTP for {user.email}")
        return JsonResponse({
            'status': 'success',
            'message': "Parol muvaffaqiyatli o'zgartirildi! 🎉"
        })

    except Exception as e:
        logger.error(f"OTP verify error: {e}")
        return JsonResponse({'status': 'error', 'message': "Xatolik yuz berdi."}, status=500)


@csrf_exempt
def api_resend_password_otp(request):
    """
    Joriy OTPni bekor qilib, yangi OTP yuborish (faqat eski OTP hali faol bo'lsa).
    """
    if not request.user.is_authenticated:
        return JsonResponse({'status': 'error', 'message': 'Tizimga kirish talab etiladi.'}, status=401)
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)

    try:
        data, error = _safe_json_parse(request)
        if error:
            return JsonResponse({'status': 'error', 'message': error}, status=400)

        otp_id = data.get('otp_id')
        if not otp_id:
            return JsonResponse({'status': 'error', 'message': "OTP ID kiritilishi shart."}, status=400)

        from accounts.models import PasswordChangeOTP
        from django.utils import timezone

        try:
            old_otp = PasswordChangeOTP.objects.get(id=otp_id, user=request.user)
        except PasswordChangeOTP.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': "So'rov topilmadi."}, status=404)

        if old_otp.is_used:
            return JsonResponse({'status': 'error', 'message': "Bu so'rov allaqachon yakunlangan."}, status=400)

        # Eski OTPni bekor qil
        old_otp.is_used = True
        old_otp.save(update_fields=['is_used'])

        # Yangi OTP yaratish (xuddi shu yangi parol xeshini ko'chirish)
        import random, string
        otp_code = ''.join(random.choices(string.digits, k=6))
        expires_at = timezone.now() + timezone.timedelta(minutes=30)

        new_otp = PasswordChangeOTP.objects.create(
            user=request.user,
            code=otp_code,
            new_password_hash=old_otp.new_password_hash,
            expires_at=expires_at,
        )

        _send_password_otp_email(request.user, otp_code)

        return JsonResponse({
            'status': 'success',
            'message': f"Yangi tasdiqlash kodi yuborildi.",
            'otp_id': new_otp.id
        })

    except Exception as e:
        logger.error(f"Resend OTP error: {e}")
        return JsonResponse({'status': 'error', 'message': "Xatolik yuz berdi."}, status=500)


def _send_password_otp_email(user, otp_code):
    """HTML email yuborish — OTP kodi bilan."""
    from django.core.mail import send_mail
    from django.conf import settings

    subject = "EduShare — Parolni almashtirish tasdiqi"
    plain_message = (
        f"Salom, {user.full_name}!\n\n"
        f"Parolni almashtirish uchun tasdiqlash kodi:\n\n"
        f"  {otp_code}\n\n"
        f"Bu kod 30 daqiqa davomida faol.\n"
        f"Agar siz bu amaliyotni bajarmagansiz, bu xabarni e'tiborsiz qoldiring.\n\n"
        f"— EduShare School jamoasi"
    )
    html_message = f"""
<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Parolni almashtirish</title>
</head>
<body style="margin:0;padding:0;background:#09090f;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090f;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#0f0f1a;border-radius:16px;border:1px solid rgba(0,242,254,0.15);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#00f2fe 0%,#4facfe 100%);padding:36px 40px;text-align:center;">
              <div style="font-size:13px;font-weight:700;letter-spacing:4px;color:#030308;text-transform:uppercase;">EduShare School</div>
              <div style="font-size:28px;font-weight:800;color:#030308;margin-top:8px;">Parolni Tasdiqlash</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="color:#94a3b8;font-size:15px;margin:0 0 8px;">Salom, <strong style="color:#e2e8f0;">{user.full_name}</strong>!</p>
              <p style="color:#64748b;font-size:14px;margin:0 0 32px;line-height:1.6;">
                Siz EduShare hisobingiz parolini o'zgartirishni so'radingiz.<br>
                Quyidagi <strong style="color:#00f2fe;">bir martalik tasdiqlash kodini</strong> kiriting:
              </p>

              <!-- OTP Code Box -->
              <div style="background:#030308;border:2px solid rgba(0,242,254,0.3);border-radius:12px;padding:32px;text-align:center;margin-bottom:32px;position:relative;">
                <div style="font-size:11px;letter-spacing:3px;color:#00f2fe;text-transform:uppercase;margin-bottom:12px;">TASDIQLASH KODI</div>
                <div style="font-size:48px;font-weight:900;letter-spacing:16px;color:#fff;font-family:'Courier New',monospace;text-shadow:0 0 20px rgba(0,242,254,0.5);">
                  {otp_code}
                </div>
                <div style="margin-top:16px;font-size:12px;color:#475569;letter-spacing:1px;">
                  ⏱ 30 daqiqa ichida faol
                </div>
              </div>

              <!-- Warning -->
              <div style="background:rgba(239,68,68,0.1);border-left:3px solid #ef4444;border-radius:4px;padding:12px 16px;margin-bottom:24px;">
                <p style="color:#f87171;font-size:12px;margin:0;line-height:1.5;">
                  🔒 Agar siz bu amaliyotni amalga oshirmagan bo'lsangiz, bu xabarni e'tiborsiz qoldiring va hisobingiz xavfsizligini tekshiring.
                </p>
              </div>

              <p style="color:#475569;font-size:12px;margin:0;line-height:1.6;text-align:center;">
                Bu kodni hech kim bilan ulashmang.<br>
                EduShare xodimlari hech qachon siz uchun parol so'ramaydi.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#08081280;padding:20px 40px;border-top:1px solid rgba(0,242,254,0.08);text-align:center;">
              <p style="color:#334155;font-size:11px;margin:0;letter-spacing:1px;">
                © 2025 EduShare School · edushare.uz
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"OTP email send failed for {user.email}: {e}")
        raise