import random

from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.contrib.auth import get_user_model

User = get_user_model()


class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    def populate_user(self, request, sociallogin, data):
        user = super().populate_user(request, sociallogin, data)

        first_name = data.get('first_name', '')
        last_name = data.get('last_name', '')
        full_name = f"{first_name} {last_name}".strip()

        if full_name:
            user.full_name = full_name
        elif data.get('name'):
            user.full_name = data['name']
        elif user.email:
            user.full_name = user.email.split('@')[0]
        else:
            user.full_name = 'User'

        if not user.username and user.email:
            base_username = user.email.split('@')[0]
            user.username = self._generate_unique_username(base_username)

        return user

    def _generate_unique_username(self, base_username):
        """Generate unique username by appending random numbers if base exists."""
        username = base_username[:30]  # Ensure max length
        if not User.objects.filter(username=username).exists():
            return username

        # Try up to 10 times with random suffix
        for _ in range(10):
            new_username = f"{base_username[:25]}{random.randint(1000, 9999)}"
            if not User.objects.filter(username=new_username).exists():
                return new_username

        # Fallback: use timestamp-based suffix
        import time
        return f"{base_username[:20]}{int(time.time())}"[:30]
