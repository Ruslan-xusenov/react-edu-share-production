from django.http import HttpResponseForbidden, HttpResponse, HttpResponseNotFound
from django.utils import timezone
from django.core.cache import cache
from django.utils.html import escape
from .models import IPBlocklist, UserActivityLog, AllowedIP
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
        
    def _is_local_ip(self, ip_address):
        local_ips = ['127.0.0.1', '::1', 'localhost', '0.0.0.0']
        if ip_address in local_ips:
            return True
        if ip_address and (ip_address.startswith('10.') or 
                          ip_address.startswith('192.168.') or
                          ip_address.startswith('172.')):
            return True
        return False

    def _should_skip_security(self, request, ip_address):
        """Skip expensive regex checks if the IP was recently verified and path is safe"""
        if any(request.path.endswith(ext) for ext in ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.mp4', '.js', '.css']):
            return True
            
        cache_key = f'security_verified_{ip_address}'
        return cache.get(cache_key) is True

    def _is_api_path(self, path):
        """Check if path is a protected area (API/Admin)"""
        # Protect both API root and Admin area
        from django.conf import settings
        admin_url = getattr(settings, 'ADMIN_URL', 'admin/')
        if not admin_url.startswith('/'):
            admin_url = '/' + admin_url
            
        return path.startswith('/api/') or path.startswith(admin_url)

    def __call__(self, request):
        if any(request.path.startswith(path) for path in self.exempt_paths):
            return self.get_response(request)
        
        ip_address = get_client_ip(request)
        from django.conf import settings
        
        # 🛡️ API/Admin IP restriction (Highest priority)
        if self._is_api_path(request.path):
            # 1. Try Cache first
            cache_key = 'allowed_api_ips_list'
            allowed_ips = cache.get(cache_key)
            
            if allowed_ips is None:
                # 2. Fetch from DB
                allowed_ips = list(AllowedIP.objects.filter(is_active=True).values_list('ip_address', flat=True))
                # 3. Add .env fallbacks if any
                env_ips = getattr(settings, 'ALLOWED_API_IPS', [])
                if isinstance(env_ips, list):
                    allowed_ips.extend(env_ips)
                # 4. Cache for 5 minutes
                cache.set(cache_key, allowed_ips, 300)

            if ip_address not in allowed_ips and not self._is_local_ip(ip_address):
                # Mask as 404 for unauthorized IPs
                log_security_event(
                    'UNAUTHORIZED_PROTECTED_ACCESS',
                    f'Unauthorized access to {request.path} from {ip_address}',
                    'WARNING'
                )
                return HttpResponseNotFound(
                    '<html><head><title>404 Not Found</title></head>'
                    '<body><center><h1>404 Not Found</h1></center><hr><center>nginx</center></body></html>'
                )

        if settings.DEBUG and self._is_local_ip(ip_address):
            response = self.get_response(request)
            if hasattr(response, 'headers'):
                response['X-Content-Type-Options'] = 'nosniff'
                response['X-Frame-Options'] = 'DENY'
                response['X-XSS-Protection'] = '1; mode=block'
                response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
            return response
        
        from django.core import signing
        
        # 1. IP yoki Cookie orqali blokni tekshirish
        is_blocked = self.is_ip_blocked(ip_address)
        block_cookie = request.COOKIES.get('edu_persistent_block')
        
        block_expiry = None
        if is_blocked:
            block = IPBlocklist.objects.filter(ip_address=ip_address).first()
            if block and block.blocked_until:
                block_expiry = block.blocked_until
        elif block_cookie:
            # IP bloklanmagan bo'lsa, cookie-dan tekshiramiz (VPN bypass uchun)
            try:
                # Cookie-dagi vaqtni o'qiymiz (signed)
                expiry_str = signing.loads(block_cookie, salt='edu_block')
                block_expiry = timezone.datetime.fromisoformat(expiry_str)
                if timezone.is_naive(block_expiry):
                    block_expiry = timezone.make_aware(block_expiry)
                
                # Agar vaqt o'tgan bo'lsa - blok yo'q
                if block_expiry <= timezone.now():
                    block_expiry = None
            except:
                block_expiry = None

        if block_expiry:
            # Blok hali faol
            response = self._forbidden_response('Siz bloklangansiz. VPN ishlatishingizning ham foydasi yo\'q!', ip_address, block_expiry)
            
            # Agar cookie yo'q bo'lsa yoki noto'g'ri bo'lsa - yangisini o'rnatamiz
            current_expiry_signed = signing.dumps(block_expiry.isoformat(), salt='edu_block')
            if block_cookie != current_expiry_signed:
                response.set_cookie('edu_persistent_block', current_expiry_signed, max_age=3600*24*30, httponly=True, samesite='Lax')
            return response
        elif block_cookie:
            # Blok muddati bitgan bo'lsa - cookie-ni tozalaymiz
            response = self.get_response(request)
            response.delete_cookie('edu_persistent_block')
            return response
        
        # 2. Skip expensive CPU checks if recently verified
        if self._should_skip_security(request, ip_address):
            response = self.get_response(request)
            self._set_security_headers(response)
            return response

        # 3. Relaxed VPN/Proxy Detection to prevent false positives
        if self._is_using_vpn_proxy(request):
            log_security_event(
                'VPN_PROXY_DETECTED',
                f'VPN/Proxy detected from {ip_address} - Path: {request.path}',
                'WARNING'
            )
        
        if self._check_sql_injection_attempt(request):
            log_security_event(
                'SQL_INJECTION_ATTEMPT',
                f'SQL injection detected from IP: {ip_address} - Path: {request.path}',
                'CRITICAL'
            )
            from django.conf import settings
            # 🚀 AVTO-BLOK: SQLi urinishi uchun 365 kunlik blok (DEBUG bo'lmasa)
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
            # 🚀 AVTO-BLOK: XSS hujumi uchun doimiy blok
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
            # 🚀 AVTO-BLOK: Path traversal uchun blok
            if not settings.DEBUG:
                self.auto_block_ip(ip_address, 'path_traversal')
            return self._forbidden_response('Xavfli path topildi')
        
        if not self.check_rate_limit(ip_address, request.path):
            self.log_suspicious_activity(ip_address, request, 'rate_limit_exceeded')
            return HttpResponse(
                '<html><head><meta charset="utf-8"><style>body{background:#030308;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;text-align:center;} h1{color:#ff4444;} p{color:rgba(255,255,255,0.7);}</style></head><body>'
                '<h1>429 Too Many Requests</h1>'
                '<p>Juda ko\'p so\'rov yuborildi. Iltimos, biroz kutib turing.</p>'
                '<p><small>1 daqiqa kutib, qaytadan urinib ko\'ring.</small></p>'
                '</body></html>',
                status=429,
                content_type='text/html; charset=utf-8'
            )
        
        response = self.get_response(request)
        
        # Cache successful verification for 10 minutes to save CPU
        cache.set(f'security_verified_{ip_address}', True, 600)
        
        self._set_security_headers(response)
        return response

    def _set_security_headers(self, response):
        """Ensure security headers are ALWAYS set"""
        if not hasattr(response, 'headers') or not isinstance(response.headers, dict):
            return
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
        response['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=(), payment=()'
    
    def _is_using_vpn_proxy(self, request):
        """Detect common VPN/Proxy headers with relaxed rules to prevent false positives"""
        # Removed HTTP_X_FORWARDED and HTTP_FORWARDED as they are often false positives
        # in Cloudflare/Nginx/Corporate Proxy environments.
        vpn_headers = [
            'HTTP_X_PROXY_ID',
            'HTTP_VIA',
            'HTTP_PROXY_CONNECTION',
        ]
        
        for h in vpn_headers:
            if request.META.get(h):
                return True
                
        return False
    
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
            # 1. Form data
            for key, value in request.POST.items():
                if key in ['q', 'search', 'query']:
                    continue
                if isinstance(value, str) and check_sql_injection(value):
                    return True
            
            # 2. JSON Body (Crucial for API login/signup)
            if request.content_type == 'application/json' and request.body:
                try:
                    import json
                    data = json.loads(request.body)
                    if isinstance(data, dict):
                        for key, value in data.items():
                            if key in ['q', 'search', 'query']:
                                continue
                            if isinstance(value, str) and check_sql_injection(value):
                                return True
                except:
                    pass
        
        return False
    
    def _check_xss_attempt(self, request):
        query_string = request.META.get('QUERY_STRING', '')
        if check_xss_attack(query_string):
            return True
        
        for key, value in request.GET.items():
            if check_xss_attack(str(value)):
                return True
        
        if request.method == 'POST':
            # 1. Form data
            for key, value in request.POST.items():
                if isinstance(value, str) and check_xss_attack(value):
                    return True
                    
            # 2. JSON Body
            if request.content_type == 'application/json' and request.body:
                try:
                    import json
                    data = json.loads(request.body)
                    if isinstance(data, dict):
                        for key, value in data.items():
                            if isinstance(value, str) and check_xss_attack(value):
                                return True
                except:
                    pass
        
        return False
    
    def _forbidden_response(self, message, ip_address=None, block_until=None):
        safe_message = escape(message)
        remaining_seconds = 0
        
        if block_until:
            remaining = (block_until - timezone.now()).total_seconds()
            remaining_seconds = int(max(0, remaining))
        elif ip_address:
            try:
                block = IPBlocklist.objects.filter(ip_address=ip_address).first()
                if block and block.blocked_until:
                    remaining = (block.blocked_until - timezone.now()).total_seconds()
                    remaining_seconds = int(max(0, remaining))
            except:
                pass

        # Timer bug ni to'g'irlash: agar vaqt 0 bo'lsa, 3600 chiqmasligi kerak
        js_seconds = remaining_seconds if remaining_seconds > 0 else 0

        html = f'''
        <html><head><meta charset="utf-8">
        <style>
            body{{background:#030308;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;text-align:center;margin:0;}}
            .card{{background:rgba(255,255,255,0.05);padding:40px;border-radius:24px;border:1px solid rgba(255,44,44,0.3);max-width:500px;backdrop-filter:blur(10px);}}
            h1{{color:#ff4444;font-size:32px;margin-bottom:15px;}}
            .timer{{font-size:48px;font-weight:700;margin:20px 0;color:#ff4444;font-family:monospace;}}
            .msg{{color:rgba(255,255,255,0.8);line-height:1.6;}}
            .vpn-msg{{background:rgba(255,68,68,0.15);padding:15px;border-radius:12px;margin:20px 0;font-weight:600;font-size:14px;border:1px solid rgba(255,68,68,0.3);}}
            .hidden{{display:none;}}
        </style>
        </head><body>
            <div class="card">
                <h1>🛑 Kirish taqiqlangan!</h1>
                <p class="msg">{safe_message}</p>
                
                <div class="vpn-msg">Xavfsizlik tizimi sizning harakatingizda xavf sezdi. VPN blokni chetlab o'tishga yordam bermaydi.</div>
                
                <div id="countdown-container" class="{'hidden' if js_seconds <= 0 else ''}">
                    <div id="countdown-label">Blokdan chiqishga qoldi:</div>
                    <div id="timer" class="timer">00:00:00</div>
                </div>
                
                <div id="reload-msg" class="{'' if js_seconds <= 0 else 'hidden'}">
                    <p>Harakatlaringiz qaytadan tekshirilishi uchun sahifani yangilang.</p>
                </div>
                
                <p><small style="color:rgba(255,255,255,0.4)">IP: {ip_address or '---'}</small></p>
            </div>
            
            <script>
                let seconds = {js_seconds};
                if (seconds > 0) {{
                    function updateTimer() {{
                        if (seconds <= 0) {{
                            document.getElementById('countdown-container').classList.add('hidden');
                            document.getElementById('reload-msg').classList.remove('hidden');
                            return;
                        }}
                        let h = Math.floor(seconds / 3600);
                        let m = Math.floor((seconds % 3600) / 60);
                        let s = seconds % 60;
                        document.getElementById('timer').innerHTML = 
                            (h < 10 ? '0'+h : h) + ":" + (m < 10 ? '0'+m : m) + ":" + (s < 10 ? '0'+s : s);
                        seconds--;
                        setTimeout(updateTimer, 1000);
                    }}
                    updateTimer();
                }}
            </script>
        </body></html>
'''
        response = HttpResponseForbidden(html, content_type='text/html; charset=utf-8')
        return response
    
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
        
        # Enforce rate limits based on path sensitivity
        sensitive_paths = ['/accounts/login/', '/accounts/signup/', '/api/accounts/login/', '/api/accounts/signup/', '/admin/', '/api/auth/']
        is_sensitive = any(path.startswith(p) for p in sensitive_paths)
        is_api = path.startswith('/api/')
        
        if is_sensitive:
            max_requests = 5  # Strict 5/min for login/signup
            window = 60
        elif is_api:
            max_requests = 100 # 100/min for API
            window = 60
        else:
            max_requests = 100 # 100/min global limit
            window = 60
        
        if requests >= max_requests:
            # Only block if we haven't already
            if requests == max_requests:
                self.increment_block_attempt(ip_address)
            return False
        
        # Consistent cache window
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
                
                # Agar blok muddati bitgan bo'lsa, yangidan 1 soat beramiz
                if not block.is_active():
                    block.blocked_until = timezone.now() + timezone.timedelta(hours=1)
                
                if block.attempt_count >= 10:
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