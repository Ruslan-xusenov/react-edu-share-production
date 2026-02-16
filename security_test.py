#!/usr/bin/env python
"""
Security Test Script - Himoya tizimlarini test qilish
"""
import requests
import time
from colorama import Fore, Style, init

init(autoreset=True)

BASE_URL = "http://127.0.0.1:8000"

def print_test(name, status):
    """Test natijasini chiroyli formatda chiqarish"""
    if status:
        print(f"{Fore.GREEN}✓{Style.RESET_ALL} {name}")
    else:
        print(f"{Fore.RED}✗{Style.RESET_ALL} {name}")

def test_sql_injection():
    """SQL Injection himoyasini test qilish"""
    print(f"\n{Fore.CYAN}=== SQL Injection Test ==={Style.RESET_ALL}")
    
    payloads = [
        "' OR '1'='1",
        "'; DROP TABLE users--",
        "1' UNION SELECT * FROM users--",
        "admin'--",
    ]
    
    for payload in payloads:
        try:
            response = requests.get(
                f"{BASE_URL}/",
                params={'search': payload},
                timeout=5
            )
            blocked = response.status_code == 403
            print_test(f"SQL Injection blocked: {payload[:30]}", blocked)
        except Exception as e:
            print(f"{Fore.RED}Error: {e}{Style.RESET_ALL}")

def test_xss_attack():
    """XSS himoyasini test qilish"""
    print(f"\n{Fore.CYAN}=== XSS Attack Test ==={Style.RESET_ALL}")
    
    payloads = [
        "<script>alert('XSS')</script>",
        "javascript:alert('XSS')",
        "<img src=x onerror=alert('XSS')>",
        "<iframe src='evil.com'>",
    ]
    
    for payload in payloads:
        try:
            response = requests.get(
                f"{BASE_URL}/",
                params={'q': payload},
                timeout=5
            )
            blocked = response.status_code == 403
            print_test(f"XSS Attack blocked: {payload[:30]}", blocked)
        except Exception as e:
            print(f"{Fore.RED}Error: {e}{Style.RESET_ALL}")

def test_rate_limiting():
    """Rate limiting himoyasini test qilish"""
    print(f"\n{Fore.CYAN}=== Rate Limiting Test ==={Style.RESET_ALL}")
    
    print(f"{Fore.YELLOW}Sending 130 requests...{Style.RESET_ALL}")
    blocked = False
    
    for i in range(130):
        try:
            response = requests.get(BASE_URL, timeout=5)
            if response.status_code == 429:
                blocked = True
                print_test(f"Rate limit activated after {i+1} requests", True)
                break
        except Exception as e:
            print(f"{Fore.RED}Error: {e}{Style.RESET_ALL}")
            break
    
    if not blocked:
        print_test("Rate limiting (130 requests should be blocked)", False)

def test_path_traversal():
    """Path Traversal himoyasini test qilish"""
    print(f"\n{Fore.CYAN}=== Path Traversal Test ==={Style.RESET_ALL}")
    
    payloads = [
        "../../etc/passwd",
        "../../../windows/system32",
        "~/secret/file",
    ]
    
    for payload in payloads:
        try:
            response = requests.get(f"{BASE_URL}/{payload}", timeout=5)
            blocked = response.status_code == 403
            print_test(f"Path Traversal blocked: {payload}", blocked)
        except Exception as e:
            print(f"{Fore.RED}Error: {e}{Style.RESET_ALL}")

def test_security_headers():
    """Security headers mavjudligini tekshirish"""
    print(f"\n{Fore.CYAN}=== Security Headers Test ==={Style.RESET_ALL}")
    
    try:
        response = requests.get(BASE_URL, timeout=5)
        headers = response.headers
        
        expected_headers = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
        }
        
        for header, expected_value in expected_headers.items():
            has_header = header in headers
            correct_value = headers.get(header) == expected_value if has_header else False
            print_test(f"{header}: {expected_value}", correct_value)
    
    except Exception as e:
        print(f"{Fore.RED}Error: {e}{Style.RESET_ALL}")

def main():
    print(f"\n{Fore.YELLOW}{'='*50}{Style.RESET_ALL}")
    print(f"{Fore.YELLOW}  EduShare Security Test Suite{Style.RESET_ALL}")
    print(f"{Fore.YELLOW}{'='*50}{Style.RESET_ALL}")
    
    print(f"\n{Fore.CYAN}Testing server: {BASE_URL}{Style.RESET_ALL}")
    
    # Server ishlayotganini tekshirish
    try:
        response = requests.get(BASE_URL, timeout=5)
        print(f"{Fore.GREEN}✓ Server is running{Style.RESET_ALL}")
    except Exception as e:
        print(f"{Fore.RED}✗ Server is not running: {e}{Style.RESET_ALL}")
        return
    
    # Testlarni boshlash
    test_security_headers()
    test_sql_injection()
    test_xss_attack()
    test_path_traversal()
    # test_rate_limiting()  # Bu test uzoq vaqt oladi, kerak bo'lsa kommentdan chiqaring
    
    print(f"\n{Fore.YELLOW}{'='*50}{Style.RESET_ALL}")
    print(f"{Fore.GREEN}Testing completed!{Style.RESET_ALL}")
    print(f"{Fore.YELLOW}{'='*50}{Style.RESET_ALL}\n")

if __name__ == "__main__":
    main()
