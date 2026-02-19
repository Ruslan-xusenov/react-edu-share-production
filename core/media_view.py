import os
import mimetypes
from django.conf import settings
from django.http import HttpResponseForbidden, FileResponse, Http404, HttpResponse

def protected_media(request, path):
    referer = request.META.get('HTTP_REFERER', '')
    
    is_authenticated = request.user.is_authenticated
    is_debug = getattr(settings, 'DEBUG', False)
    
    # Ruxsatlarni tekshirish
    if not referer:
        if not (is_authenticated or is_debug):
            return HttpResponseForbidden("Direct access to media is not allowed.")
    elif 'edushare.uz' not in referer and 'localhost' not in referer and '127.0.0.1' not in referer:
        if not is_debug:
            return HttpResponseForbidden("Access from this domain is not allowed.")

    # Fayl mavjudligini tekshirish
    document_root = settings.MEDIA_ROOT
    file_path = os.path.join(document_root, path)
    
    if not os.path.exists(file_path):
        raise Http404("Media fayli topilmadi")

    # Production uchun X-Accel-Redirect ishlatish (Nginx videoni uzatadi)
    if not is_debug:
        response = HttpResponse()
        # Nginx internal location "/protected_media/" ga yo'naltirish
        response['X-Accel-Redirect'] = f'/protected_media/{path}'
        content_type, encoding = mimetypes.guess_type(file_path)
        response['Content-Type'] = content_type or 'application/octet-stream'
        return response
    
    # Development uchun oddiy FileResponse
    content_type, encoding = mimetypes.guess_type(file_path)
    content_type = content_type or 'application/octet-stream'
    return FileResponse(open(file_path, 'rb'), content_type=content_type)