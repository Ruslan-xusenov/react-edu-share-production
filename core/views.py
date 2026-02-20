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


@csrf_exempt
def ai_chat(request):
    """AI Chat proxy endpoint — calls OpenRouter API from server side"""
    import requests as req
    import json
    import logging

    logger = logging.getLogger('django')

    if request.method != 'POST':
        return JsonResponse({'error': 'POST only'}, status=405)

    try:
        body = json.loads(request.body)
        messages = body.get('messages', [])

        if not messages:
            return JsonResponse({'error': 'No messages provided'}, status=400)

        OPENROUTER_API_KEY = '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'

        SYSTEM_PROMPT = (
            "Sen EduShare AI — aqlli va do'stona yordamchi.\n\n"
            "Agar foydalanuvchi salomlashsa (salom, hello, hi, assalomu alaykum va h.k.), "
            "do'stona javob ber va o'zingni tanishtir.\n\n"
            "Sen quyidagi barcha mavzularda yordam bera olasan:\n"
            "- 📚 Ta'lim fanlari: matematika, fizika, kimyo, biologiya, tarix, geografiya, adabiyot\n"
            "- 🌐 Tillar: ingliz tili, rus tili, o'zbek tili grammatikasi\n"
            "- 💻 Texnologiya va IT: dasturlash, networking, kompyuter fanlari, AI\n"
            "- 🎵 San'at va madaniyat: musiqa, rassomchilik, kino, adabiyot\n"
            "- ⚽ Sport va sog'liq: sport turlari, jismoniy tarbiya, salomatlik\n"
            "- 🔬 Fan va texnika: astronomiya, robototexnika, muhandislik\n"
            "- 📊 Biznes va iqtisod: marketing, menejment, moliya asoslari\n"
            "- 🌍 Umumiy bilim: geografiya, ekologiya, jamiyat\n\n"
            "Sen FAQAT quyidagi mavzulardan BOSH TORTASAN:\n"
            "- Zo'ravonlik, qurol-yarog', noqonuniy faoliyat\n"
            "- Kattalar uchun (18+) kontent\n"
            "- Haqorat, irqchilik, diskriminatsiya\n"
            "- Shaxsiy ma'lumotlarni so'rash yoki tarqatish\n\n"
            "Agar foydalanuvchi taqiqlangan mavzu haqida so'rasa, muloyimlik bilan rad et:\n"
            "\"Kechirasiz, bu mavzuda yordam bera olmayman. "
            "Boshqa savol bering!\"\n\n"
            "Javoblaringni o'zbek tilida, tushunarli va qisqa ber. "
            "Kerak bo'lsa misollar va tushuntirishlar qo'sh."
        )

        api_messages = [{'role': 'system', 'content': SYSTEM_PROMPT}] + messages

        logger.info(f"[AI Chat] Sending request to OpenRouter with model openai/gpt-4.1-nano")

        response = req.post(
            'https://openrouter.ai/api/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {OPENROUTER_API_KEY}',
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://edushare.uz',
                'X-Title': 'EduShare AI',
            },
            json={
                'model': 'openai/gpt-4.1-nano',
                'messages': api_messages,
                'max_tokens': 1024,
                'temperature': 0.7,
            },
            timeout=30,
        )

        logger.info(f"[AI Chat] OpenRouter response status: {response.status_code}")
        logger.info(f"[AI Chat] OpenRouter response body: {response.text[:500]}")

        data = response.json()

        # Check for API error response
        if response.status_code != 200:
            error_msg = data.get('error', {})
            if isinstance(error_msg, dict):
                error_msg = error_msg.get('message', str(error_msg))
            logger.error(f"[AI Chat] OpenRouter API error: {error_msg}")
            return JsonResponse({
                'status': 'error',
                'content': f'AI xizmati xatosi: {error_msg}'
            }, status=502)

        if 'choices' in data and data['choices']:
            content = data['choices'][0].get('message', {}).get('content', '')
            return JsonResponse({'status': 'success', 'content': content})
        else:
            logger.error(f"[AI Chat] No choices in response: {data}")
            return JsonResponse({
                'status': 'error',
                'content': f'AI javob bermadi. Response: {json.dumps(data)[:200]}'
            }, status=500)

    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except req.exceptions.Timeout:
        return JsonResponse({'error': 'AI server timeout'}, status=504)
    except req.exceptions.ConnectionError as e:
        logger.error(f"[AI Chat] Connection error: {str(e)}")
        return JsonResponse({
            'error': f'OpenRouter ulanish xatosi: {str(e)[:200]}'
        }, status=502)
    except Exception as e:
        logger.error(f"[AI Chat] Unexpected error: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)