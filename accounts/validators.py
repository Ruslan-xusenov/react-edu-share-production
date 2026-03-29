import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _

class ComplexityValidator:
    def validate(self, password, user=None):
        if not re.search(r'[A-Z]', password):
            raise ValidationError(
                _("Parolda kamida bitta katta harf bo'lishi kerak."),
                code='password_no_upper',
            )
        if not re.search(r'[a-z]', password):
            raise ValidationError(
                _("Parolda kamida bitta kichik harf bo'lishi kerak."),
                code='password_no_lower',
            )
        if not re.search(r'[0-9]', password):
            raise ValidationError(
                _("Parolda kamida bitta raqam bo'lishi kerak."),
                code='password_no_number',
            )
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            raise ValidationError(
                _("Parolda kamida bitta maxsus belgi bo'lishi kerak (!@#$%^&*...)."),
                code='password_no_symbol',
            )

    def get_help_text(self):
        return _(
            "Parolingiz kamida bitta katta harf, bitta kichik harf, bitta raqam va bitta maxsus belgi o'z ichiga olishi kerak."
        )
