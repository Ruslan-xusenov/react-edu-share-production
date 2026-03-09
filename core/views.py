from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from .models import Notification, ChatViolation, ChatBotAccess
from accounts.models import CustomUser
from django.db.models import Count
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from courses.models import Category, Lesson, Certificate
import os

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
VIOLATION_KEYWORDS = {
    'hacking': [
        'hack', 'crack', 'exploit', 'vulnerability', 'ddos', 'dos attack',
        'brute force', 'phishing', 'malware', 'trojan', 'ransomware',
        'keylogger', 'backdoor', 'rootkit', 'injection', 'reverse shell',
        'metasploit', 'nmap scan', 'password crack', 'wifi hack',
        'buzish', 'buzib kirish', 'parolni buzish', 'tizimni buzish',
        'hujum qilish', 'hujum yozib ber', 'hujum kodi',
    ],
    'violence': [
        'qurol', 'bomba', 'portlatish', 'o\'ldirish', 'o\'ldir',
        'otish', 'pichoq', 'qotillik', 'terroristik', 'terror',
        'zaharla', 'zaharlash', 'dinamit', 'granata',
    ],
    'adult': [
        'pornograf', '18+', 'erotik', 'seksual', 'yalang\'och',
        'noqonuniy video', 'bolalar pornog',
    ],
    'harassment': [
        'irqchi', 'diskriminats', 'haqorat', 'kamsit',
        'fashistik', 'natsistik',
    ],
    'harmful': [
        'narkotik', 'giyohvand', 'nasha', 'gashish', 'geroin',
        'metamfetamin', 'kokain', 'firibgarlik', 'fraud',
        'pul yuvish', 'qalbaki pul', 'soxta hujjat',
    ],
}


def detect_violation(text):
    lower = text.lower()
    for v_type, keywords in VIOLATION_KEYWORDS.items():
        for kw in keywords:
            if kw in lower:
                if v_type in ('hacking', 'violence', 'adult'):
                    severity = 'high'
                elif v_type in ('harassment', 'harmful'):
                    severity = 'critical'
                else:
                    severity = 'medium'
                return v_type, severity, kw
    return None, None, None


def log_violation(user, user_email, user_message, ai_response, violation_type, severity, ip, user_agent):
    from django.utils import timezone

    ChatViolation.objects.create(
        user=user,
        user_email=user_email,
        user_message=user_message,
        ai_response=ai_response,
        violation_type=violation_type,
        severity=severity,
        ip_address=ip,
        user_agent=user_agent,
    )

    if user:
        access, created = ChatBotAccess.objects.get_or_create(
            user=user,
            defaults={
                'violation_count': 1,
                'last_violation_at': timezone.now(),
            }
        )
        if not created:
            access.violation_count += 1
            access.last_violation_at = timezone.now()
            access.save(update_fields=['violation_count', 'last_violation_at'])

        if access.violation_count >= 5 and access.block_type == 'none':
            from datetime import timedelta
            access.block_type = 'temporary'
            access.blocked_until = timezone.now() + timedelta(hours=24)
            access.block_reason = f'Avtomatik blok: {access.violation_count} ta qoidabuzarlik'
            access.save()


@csrf_exempt
def ai_chat(request):
    import requests as req
    import json
    import logging
    from django.core.cache import cache
    from django.utils import timezone

    logger = logging.getLogger('django')

    if request.method != 'POST':
        return JsonResponse({'error': 'POST only'}, status=405)

    if len(request.body) > 51200:
        return JsonResponse({'error': "So'rov hajmi juda katta."}, status=413)

    ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR', '0.0.0.0')
    user_agent = request.META.get('HTTP_USER_AGENT', '')

    rate_key = f'ai_chat_rate_{ip}'
    ai_requests = cache.get(rate_key, 0)
    if ai_requests >= 15:
        logger.warning(f"[AI Chat] Rate limit exceeded for IP: {ip}")
        return JsonResponse({'error': "Juda ko'p so'rov. 1 daqiqa kutib turing."}, status=429)
    cache.set(rate_key, ai_requests + 1, 60)

    current_user = request.user if request.user.is_authenticated else None
    user_email = current_user.email if current_user else f'anonymous_{ip}'

    if current_user:
        try:
            access = ChatBotAccess.objects.get(user=current_user)
            if access.is_blocked():
                remaining = access.get_remaining_time()
                if access.block_type == 'permanent':
                    msg = "🚫 Sizning chatbot'dan foydalanish huquqingiz bloklangan. Admin bilan bog'laning."
                else:
                    msg = f"⏳ Chatbot'dan foydalanish huquqingiz vaqtinchalik bloklangan. Qolgan vaqt: {remaining or 'noma`lum'}"
                return JsonResponse({
                    'status': 'blocked',
                    'content': msg,
                    'blocked': True,
                    'block_type': access.block_type,
                }, status=403)
        except ChatBotAccess.DoesNotExist:
            pass

    try:
        body = json.loads(request.body)
        messages = body.get('messages', [])

        if not messages:
            return JsonResponse({'error': 'No messages provided'}, status=400)

        if len(messages) > 20:
            messages = messages[-20:]

        last_user_message = ''
        for msg in reversed(messages):
            if msg.get('role') == 'user':
                last_user_message = msg.get('content', '')
                break

        violation_type, severity, matched_keyword = detect_violation(last_user_message)
        if violation_type:
            refusal_msg = (
                "⚠️ Kechirasiz, bu turdagi so'rovlarga javob bera olmayman. "
                "Men faqat ta'lim sohasidagi savollarga javob beraman. "
                "Iltimos, ta'limga oid savol bering!"
            )

            log_violation(
                user=current_user,
                user_email=user_email,
                user_message=last_user_message,
                ai_response=refusal_msg,
                violation_type=violation_type,
                severity=severity,
                ip=ip,
                user_agent=user_agent,
            )

            logger.warning(
                f"[AI Chat] VIOLATION from {user_email} (IP: {ip}): "
                f"type={violation_type}, keyword='{matched_keyword}', "
                f"message='{last_user_message[:100]}'"
            )

            return JsonResponse({
                'status': 'violation',
                'content': refusal_msg,
                'violation': True,
            })

        sanitized_messages = []
        for msg in messages:
            role = msg.get('role', 'user')
            content = msg.get('content', '')
            if role not in ('user', 'assistant'):
                role = 'user'
            if not isinstance(content, str):
                content = str(content)
            content = content[:2000]
            sanitized_messages.append({'role': role, 'content': content})

        OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY', '')

        if not OPENROUTER_API_KEY:
            logger.error("[AI Chat] OPENROUTER_API_KEY is not set!")
            return JsonResponse({
                'status': 'error',
                'content': 'AI xizmati vaqtincha mavjud emas.'
            }, status=503)

        SYSTEM_PROMPT = (
            "Sen EduShare AI nomli aqlli yordamchisan. Toza o'zbek tilida, muloyim va tushunarli javob ber.\n\n"
            "SENING ASOSIY VAZIFANG: Faqat ta'lim, fan, tillar va texnologiya sohalari bo'yicha savollarga javob berish.\n"
            "Ruxsat etilgan mavzular: Matematika, Fizika, Kimyo, Biologiya, Tarix, Geografiya, Adabiyot, "
            "Ingliz, Rus va O'zbek tili grammatikasi, Dasturlash (Python, JS, va h.k.), Robototexnika, Iqtisod.\n\n"
            "CHEKLOVLAR:\n"
            "- Agar foydalanuvchi salomlashsa, do'stona alik ol va o'zingni ta'limiy yordamchi deb tanishtir.\n"
            "- Ta'limga aloqador bo'lmagan (siyosat, sport, o'yin, shaxsiy savollar) so'rovlarga: "
            "\"Kechirasiz, men faqat ta'lim sohasidagi savollarga javob beraman. Iltimos, ta'limga oid savol bering!\" deb javob ber.\n"
            "- Hech qachon 18+ kontent, zo'ravonlik yoki hacking haqida ma'lumot berma."
        )

        api_messages = [{'role': 'system', 'content': SYSTEM_PROMPT}] + sanitized_messages

        logger.info(f"[AI Chat] Request from {user_email} (IP: {ip})")

        response = req.post(
            'https://openrouter.ai/api/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {OPENROUTER_API_KEY}',
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://edushare.uz',
                'X-Title': 'EduShare AI',
            },
            json={
                'model': 'openrouter/free',
                'messages': api_messages,
                'temperature': 0.7,
                'max_tokens': 1024,
            },
            timeout=40,
        )

        logger.info(f"[AI Chat] OpenRouter response status: {response.status_code}")

        data = response.json()

        if response.status_code != 200:
            error_data = {}
            try:
                error_data = response.json()
            except:
                pass
            
            error_msg = error_data.get('error', {})
            if isinstance(error_msg, dict):
                error_msg = error_msg.get('message', 'Unknown error')
            
            logger.error(f"[AI Chat] OpenRouter API error ({response.status_code}): {error_msg}")
            
            # Agar API key xato bo'lsa, aniqroq aytsin
            if response.status_code == 401:
                return JsonResponse({'status': 'error', 'content': 'AI xizmati autentifikatsiyasi xato (API Key).'}, status=502)
                
            return JsonResponse({
                'status': 'error', 
                'content': f'AI xizmatida xatolik ({response.status_code}). Qayta urinib ko\'ring.'
            }, status=502)

        if 'choices' in data and data['choices']:
            content = data['choices'][0].get('message', {}).get('content', '')

            refusal_indicators = [
                'javob bera olmayman', 'rad etaman', 'ta\'limga oid emas',
                'yordam bera olmayman', 'man etilgan',
            ]
            if any(indicator in content.lower() for indicator in refusal_indicators):
                log_violation(
                    user=current_user,
                    user_email=user_email,
                    user_message=last_user_message,
                    ai_response=content,
                    violation_type='off_topic',
                    severity='low',
                    ip=ip,
                    user_agent=user_agent,
                )
                logger.info(
                    f"[AI Chat] AI refused request from {user_email}: '{last_user_message[:80]}'"
                )

            return JsonResponse({'status': 'success', 'content': content})
        else:
            logger.error(f"[AI Chat] No choices in response: {data}")
            return JsonResponse({
                'status': 'error',
                'content': 'AI javob bermadi. Qayta urinib ko\'ring.'
            }, status=500)

    except json.JSONDecodeError:
        return JsonResponse({'error': "Noto'g'ri so'rov formati."}, status=400)
    except req.exceptions.Timeout:
        return JsonResponse({'error': 'AI xizmati javob bermadi. Qayta urinib ko\'ring.'}, status=504)
    except req.exceptions.ConnectionError as e:
        logger.error(f"[AI Chat] Connection error: {str(e)}")
        return JsonResponse({
            'error': 'AI xizmatiga ulanib bo\'lmadi.'
        }, status=502)
    except Exception as e:
        logger.error(f"[AI Chat] Unexpected error: {str(e)}")
        return JsonResponse({'error': 'Ichki xatolik yuz berdi.'}, status=500)