from allauth.socialaccount.adapter import DefaultSocialAccountAdapter


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
            user.username = base_username

        return user
