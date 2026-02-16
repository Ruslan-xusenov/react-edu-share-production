import requests

def check_endpoints():
    base_url = "http://127.0.0.1:8000/api/"
    endpoints = ["categories/", "lessons/", "comments/", "assignments/"]
    
    for endpoint in endpoints:
        try:
            response = requests.get(base_url + endpoint)
            print(f"Endpoint: {endpoint} | Status: {response.status_code}")
            if response.status_code != 200:
                print(f"Error: {response.text[:200]}")
        except Exception as e:
            print(f"Failed to connect to {endpoint}: {e}")

if __name__ == "__main__":
    check_endpoints()