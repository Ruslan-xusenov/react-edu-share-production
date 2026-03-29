import multiprocessing

# Gunicorn configuration for production
bind = "0.0.0.0:8000"
workers = multiprocessing.cpu_count() * 2 + 1
threads = 4
worker_class = "gthread"
timeout = 120
accesslog = "-"  # Log to stdout
errorlog = "-"   # Log to stdout
loglevel = "info"
preload_app = True
keepalive = 5
max_requests = 1000
max_requests_jitter = 50