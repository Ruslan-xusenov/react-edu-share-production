import os
import hashlib
from django.conf import settings

# 🛡️ EduShare Software Activation System
# Ushbu hash "EDUSHARE-PRO-2026-RUSLAN-XUSENOV-UZ" kalitiga mos keladi.
# Kalitni .env fayliga EDU_LICENSE_KEY nomi bilan yozing.
LICENSE_HASH = "1ba53ed4b2aeb32f22ac43436ed0bfc9930d2b29732fc901e42159fdc21511ec"

def is_license_valid():
    # Development rejimida litsenziya shart emas
    if getattr(settings, "DEBUG", False):
        return True
    
    key = os.getenv("EDU_LICENSE_KEY", "")
    if not key:
        return False
    
    # Kalitni tekshirish
    key_hash = hashlib.sha256(key.strip().encode()).hexdigest()
    return key_hash == LICENSE_HASH

def get_activation_message():
    return {
        "title": "Dastur faollashtirilmagan (Not Activated)",
        "message": "EduShare tizimidan foydalanish uchun litsenziya kaliti talab qilinadi. "
                  "Iltimos, tizim egasi Ruslan Xusenov bilan bog'laning.",
        "contact": "Support: @Ruslan_Xusenov",
        "site": "edushare.uz"
    }