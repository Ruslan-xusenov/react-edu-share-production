import os
import mimetypes
from django.conf import settings
from django.http import HttpResponseForbidden, FileResponse, Http404

def protected_media(request, path):
    referer = request.META.get('HTTP_REFERER', '')
    
    is_authenticated = request.user.is_authenticated
    is_debug = getattr(settings, 'DEBUG', False)
    
    if not referer:
        if not (is_authenticated or is_debug):
            return HttpResponseForbidden("Direct access to media is not allowed.")
    elif settings.FRONTEND_URL not in referer and 'localhost' not in referer and '127.0.0.1' not in referer:
        if not is_debug:
            return HttpResponseForbidden("Access from this domain is not allowed.")

    document_root = settings.MEDIA_ROOT
    file_path = os.path.join(document_root, path)
    
    if os.path.exists(file_path):
        content_type, encoding = mimetypes.guess_type(file_path)
        content_type = content_type or 'application/octet-stream'
        response = FileResponse(open(file_path, 'rb'), content_type=content_type)
        
        return response
    else:
        raise Http404("Media file does not exist")