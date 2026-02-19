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

    if request.method != 'POST':
        return JsonResponse({'error': 'POST only'}, status=405)

    try:
        body = json.loads(request.body)
        messages = body.get('messages', [])

        if not messages:
            return JsonResponse({'error': 'No messages provided'}, status=400)

        OPENROUTER_API_KEY = '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'

        SYSTEM_PROMPT = (
            "Sen EduShare AI — faqat ta'lim uchun yaratilgan yordamchi.\n\n"
            "Agar foydalanuvchi salomlashsa (salom, hello, hi, assalomu alaykum va h.k.), "
            "do'stona javob ber va o'zingni tanishtir: 'Men EduShare AI yordamchisiman. "
            "Sizga ta'lim fanlari bo'yicha yordam bera olaman. Savol bering!' de.\n\n"
            "🚨 MUHIM QOIDA: Sen FAQAT maktab va universitetdagi FANLAR "
            "(matematika, fizika, kimyo, biologiya, tarix, geografiya, ingliz tili, adabiyot) "
            "bo'yicha NAZARIY tushuntirish berasan.\n\n"
            "Sen HECH QACHON quyidagilarni qilmasliging kerak:\n"
            "- Kod yozib berish (Python, JavaScript, HTML yoki boshqa tilda)\n"
            "- Bot, dastur, sayt, ilova yaratishga yordam berish\n"
            "- Retsept, sport, ob-havo, film, musiqa, o'yin haqida gapirish\n"
            "- Siyosat, din, shaxsiy maslahat berish\n"
            "- Telegram bot, Discord bot yoki boshqa texnik loyiha qilish\n"
            "- Hech qanday amaliy kod, script yoki texnik yechim berish\n\n"
            "Sen FAQAT:\n"
            "- Maktab fanlari bo'yicha nazariy savollarni tushuntirasan\n"
            "- Matematika formulalari va misollarni yechishga yordam berasan\n"
            "- Ingliz tili grammatikasi va so'z boyligini o'rgatasan\n"
            "- EduShare platformasidan foydalanish haqida ma'lumot berasan\n"
            "- Imtihonga tayyorgarlik bo'yicha maslahat berasan\n\n"
            "Agar foydalanuvchi ta'limga oid bo'lmagan savol bersa, DOIM aynan shu javobni ber:\n"
            "\"📚 Kechirasiz, men faqat ta'lim fanlari bo'yicha nazariy savollarga javob beraman. "
            "Kod yozish yoki texnik loyihalar bilan yordam bera olmayman. "
            "Iltimos, fan bo'yicha savol bering!\"\n\n"
            "Bu qoidani HECH QACHON buzma."
        )

        api_messages = [{'role': 'system', 'content': SYSTEM_PROMPT}] + messages

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

        data = response.json()

        if 'choices' in data and data['choices']:
            content = data['choices'][0].get('message', {}).get('content', '')
            return JsonResponse({'status': 'success', 'content': content})
        else:
            return JsonResponse({'status': 'error', 'content': 'AI javob bermadi'}, status=500)

    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except req.exceptions.Timeout:
        return JsonResponse({'error': 'AI server timeout'}, status=504)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)