from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
from .models import CustomUser
from .forms import ProfileForm


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
        }
    })


@csrf_exempt
def api_leaderboard(request):
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
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email')
            password = data.get('password')
            user = authenticate(request, username=email, password=password)
            if user:
                login(request, user)
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
            return JsonResponse({'status': 'error', 'message': 'Invalid credentials'}, status=400)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
    return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)

@csrf_exempt
def api_signup(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email')
            password = data.get('password')
            full_name = data.get('full_name')
            
            username = data.get('username')
            if not username and email:
                username = email.split('@')[0]
            
            import random
            base_username = username
            while CustomUser.objects.filter(username=username).exists():
                username = f"{base_username}{random.randint(100, 999)}"

            if not full_name:
                full_name = username
            
            if CustomUser.objects.filter(email=email).exists():
                return JsonResponse({'status': 'error', 'message': 'Email already exists'}, status=400)
            
            user = CustomUser.objects.create_user(
                username=username,
                email=email,
                password=password,
                full_name=full_name
            )
            login(request, user, backend='django.contrib.auth.backends.ModelBackend')
            
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
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
    return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)

@csrf_exempt
def api_update_profile(request):
    if not request.user.is_authenticated:
        return JsonResponse({'status': 'error', 'message': 'Not authenticated'}, status=401)
    if request.method == 'POST':
        try:
            user = request.user
            if request.content_type.startswith('multipart/form-data'):
                data = request.POST
                if 'avatar' in request.FILES:
                    user.avatar = request.FILES['avatar']
            else:
                data = json.loads(request.body)
            
            if 'full_name' in data:
                user.full_name = data['full_name']
            if 'school' in data:
                user.school = data['school']
            if 'grade' in data:
                user.grade = data['grade']
            if 'phone_number' in data:
                user.phone_number = data['phone_number']
            if 'bio' in data:
                user.bio = data['bio']
                
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
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
    return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)

@csrf_exempt
def api_change_password(request):
    if not request.user.is_authenticated:
        return JsonResponse({'status': 'error', 'message': 'Not authenticated'}, status=401)
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user = request.user
            old_password = data.get('old_password')
            new_password = data.get('new_password')
            
            if not user.check_password(old_password):
                 return JsonResponse({'status': 'error', 'message': 'Incorrect old password'}, status=400)
            
            user.set_password(new_password)
            user.save()
            from django.contrib.auth import update_session_auth_hash
            update_session_auth_hash(request, user)
            
            return JsonResponse({'status': 'success', 'message': 'Password changed successfully'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
    return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)

@csrf_exempt
def api_logout(request):
    from django.contrib.auth import logout
    logout(request)
    return JsonResponse({'status': 'success'})