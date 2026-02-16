from django.http import HttpResponseForbidden, HttpResponse
from django.utils import timezone
from django.core.cache import cache
from django.utils.html import escape
from .models import IPBlocklist, UserActivityLog
from .security_utils import (
    check_sql_injection, check_xss_attack, 
    check_path_traversal, log_security_event,
    get_client_ip
)
import re


def parse_user_agent(user_agent_string):
    if not user_agent_string:
        return {
            'device_type': 'unknown',
            'browser': 'unknown',
            'os': 'unknown'
        }
    
    user_agent_lower = user_agent_string.lower()
    
    if 'mobile' in user_agent_lower or 'android' in user_agent_lower:
        device_type = 'mobile'
    elif 'tablet' in user_agent_lower or 'ipad' in user_agent_lower:
        device_type = 'tablet'
    else:
        device_type = 'desktop'
    
    if 'edg' in user_agent_lower:
        browser = 'Microsoft Edge'
    elif 'chrome' in user_agent_lower:
        browser = 'Google Chrome'
    elif 'firefox' in user_agent_lower:
        browser = 'Mozilla Firefox'
    elif 'safari' in user_agent_lower:
        browser = 'Safari'
    elif 'opera' in user_agent_lower or 'opr' in user_agent_lower:
        browser = 'Opera'
    else:
        browser = 'Other'
    
    if 'windows' in user_agent_lower:
        os = 'Windows'
    elif 'mac' in user_agent_lower:
        os = 'macOS'
    elif 'linux' in user_agent_lower:
        os = 'Linux'
    elif 'android' in user_agent_lower:
        os = 'Android'
    elif 'ios' in user_agent_lower or 'iphone' in user_agent_lower:
        os = 'iOS'
    else:
        os = 'Other'
    
    return {
        'device_type': device_type,
        'browser': browser,
        'os': os
    }


class AdvancedSecurityMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.exempt_paths = [
            '/static/',
            '/media/',
            '/favicon.ico',
            '/__debug__/',
        ]
        
    def __call__(self, request):
        if any(request.path.startswith(path) for path in self.exempt_paths):
            return self.get_response(request)
        
        ip_address = get_client_ip(request)
        
        if self.is_ip_blocked(ip_address):
            safe_ip = escape(ip_address)
            log_security_event(
                'IP_BLOCKED', 
                f'Blocked IP attempted access: {safe_ip} - Path: {request.path}',
                'WARNING'
            )
            return self._forbidden_response(f'IP bloklangan: {safe_ip}')
        
        if self._check_sql_injection_attempt(request):
            log_security_event(
                'SQL_INJECTION_ATTEMPT',
                f'SQL injection detected from IP: {ip_address} - Path: {request.path}',
                'CRITICAL'
            )
            from django.conf import settings
            if not settings.DEBUG:
                self.auto_block_ip(ip_address, 'sql_injection')
            return self._forbidden_response('Xavfli so\'rov topildi (SQL)')
        
        if self._check_xss_attempt(request):
            log_security_event(
                'XSS_ATTEMPT',
                f'XSS attack detected from IP: {ip_address} - Path: {request.path}',
                'CRITICAL'
            )
            from django.conf import settings
            if not settings.DEBUG:
                self.auto_block_ip(ip_address, 'xss_attack')
            return self._forbidden_response('Xavfli so\'rov topildi (XSS)')
        
        if check_path_traversal(request.path):
            log_security_event(
                'PATH_TRAVERSAL_ATTEMPT',
                f'Path traversal detected from IP: {ip_address} - Path: {request.path}',
                'CRITICAL'
            )
            from django.conf import settings
            if not settings.DEBUG:
                self.auto_block_ip(ip_address, 'path_traversal')
            return self._forbidden_response('Xavfli path topildi')
        
        if not self.check_rate_limit(ip_address, request.path):
            self.log_suspicious_activity(ip_address, request, 'rate_limit_exceeded')
            return HttpResponse(
                '<html><head><meta charset="utf-8"></head><body>'
                '<h1>429 Too Many Requests</h1>'
                '<p>Juda ko\'p so\'rov yuborildi. Iltimos, biroz kutib turing.</p>'
                '<p><small>1 daqiqa kutib, qaytadan urinib ko\'ring.</small></p>'
                '</body></html>',
                status=429,
                content_type='text/html; charset=utf-8'
            )
        
        response = self.get_response(request)
        
        if not hasattr(response, 'headers'):
            return response
            
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        
        return response
    
    def _check_sql_injection_attempt(self, request):
        query_string = request.META.get('QUERY_STRING', '')
        if check_sql_injection(query_string):
            return True
        
        for key, value in request.GET.items():
            if key in ['q', 'search', 'query']:
                continue
            if check_sql_injection(str(value)):
                return True
        
        if request.method == 'POST':
            for key, value in request.POST.items():
                if key in ['q', 'search', 'query']:
                    continue
                if isinstance(value, str) and check_sql_injection(value):
                    return True
        
        return False
    
    def _check_xss_attempt(self, request):
        query_string = request.META.get('QUERY_STRING', '')
        if check_xss_attack(query_string):
            return True
        
        for key, value in request.GET.items():
            if check_xss_attack(str(value)):
                return True
        
        if request.method == 'POST':
            for key, value in request.POST.items():
                if isinstance(value, str) and check_xss_attack(value):
                    return True
        
        return False
    
    def _forbidden_response(self, message):
        safe_message = escape(message)
        return HttpResponseForbidden(
            '<html><head><meta charset="utf-8"></head><body>'
            '<h1>403 Forbidden</h1>'
            f'<p>{safe_message}</p>'
            '<p><small>Xavfsizlik sabablariga ko\'ra so\'rovingiz rad etildi.</small></p>'
            '</body></html>',
            content_type='text/html; charset=utf-8'
        )
    
    def is_ip_blocked(self, ip_address):
        if not ip_address or ip_address == '0.0.0.0':
            return False
            
        cache_key = f'ip_blocked_{ip_address}'
        is_blocked = cache.get(cache_key)
        
        if is_blocked is None:
            try:
                block = IPBlocklist.objects.get(ip_address=ip_address)
                is_blocked = block.is_active()
                cache.set(cache_key, is_blocked, 300)
            except IPBlocklist.DoesNotExist:
                is_blocked = False
                cache.set(cache_key, False, 300)
        
        return is_blocked
    
    def check_rate_limit(self, ip_address, path):
        cache_key = f'rate_limit_{ip_address}'
        requests = cache.get(cache_key, 0)
        
        sensitive_paths = ['/accounts/login/', '/accounts/signup/', '/admin/']
        is_sensitive = any(path.startswith(p) for p in sensitive_paths)
        
        is_api = path.startswith('/api/')
        
        if is_sensitive:
            max_requests = 10
            window = 60
        elif is_api:
            max_requests = 50
            window = 60
        else:
            max_requests = 120
            window = 60
        
        if requests >= max_requests:
            self.increment_block_attempt(ip_address)
            return False
        
        cache.set(cache_key, requests + 1, window)
        return True
    
    def auto_block_ip(self, ip_address, reason):
        try:
            block, created = IPBlocklist.objects.get_or_create(
                ip_address=ip_address,
                defaults={
                    'reason': reason,
                    'description': f'Avtomatik bloklangan - {reason}',
                    'attempt_count': 1,
                    'is_permanent': True,
                    'blocked_until': timezone.now() + timezone.timedelta(days=365),
                }
            )
            if not created:
                block.attempt_count += 1
                block.is_permanent = True
                block.save()
            
            cache.set(f'ip_blocked_{ip_address}', True, 300)
            
            log_security_event(
                'AUTO_BLOCK',
                f'IP {ip_address} automatically blocked for {reason}',
                'CRITICAL'
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in auto_block_ip: {e}")
    
    def increment_block_attempt(self, ip_address):
        try:
            block, created = IPBlocklist.objects.get_or_create(
                ip_address=ip_address,
                defaults={
                    'reason': 'rate_limit',
                    'description': 'Avtomatik bloklangan - juda ko\'p so\'rov',
                    'attempt_count': 1,
                    'blocked_until': timezone.now() + timezone.timedelta(hours=1),
                }
            )
            if not created:
                block.attempt_count += 1
                block.last_attempt = timezone.now()
                
                if block.attempt_count >= 3:
                    block.is_permanent = True
                    block.reason = 'ddos'
                    block.description = 'Avtomatik doimiy blok - DDoS hujum belgisi'
                
                block.save()
                cache.set(f'ip_blocked_{ip_address}', True, 300)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in increment_block_attempt: {e}")
    
    def log_suspicious_activity(self, ip_address, request, activity_type='suspicious'):
        try:
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            parsed_ua = parse_user_agent(user_agent)
            
            if len(user_agent) > 500:
                user_agent = user_agent[:500] + '...'
            
            UserActivityLog.objects.create(
                user=request.user if request.user.is_authenticated else None,
                activity_type=activity_type,
                ip_address=ip_address,
                user_agent=user_agent,
                device_type=parsed_ua['device_type'],
                browser=parsed_ua['browser'],
                os=parsed_ua['os'],
                success=False,
                error_message=f'{activity_type} - Path: {request.path}'
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error logging suspicious activity: {e}")


SecurityMiddleware = AdvancedSecurityMiddleware