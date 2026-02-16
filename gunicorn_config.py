"""
Gunicorn configuration file for EduShare
"""
import multiprocessing
import os

# Server Socket
bind = '127.0.0.1:8000'
backlog = 2048

# Worker Processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = 'sync'
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 50
timeout = 30
keepalive = 2

# Logging
accesslog = '/var/log/edushare/gunicorn-access.log'
errorlog = '/var/log/edushare/gunicorn-error.log'
loglevel = 'info'
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

# Process Naming
proc_name = 'edushare'

# Server Mechanics
daemon = False
pidfile = '/var/run/edushare/gunicorn.pid'
user = None
group = None
tmp_upload_dir = None

# SSL (agar Nginx ishlatmasangiz)
# keyfile = '/path/to/keyfile'
# certfile = '/path/to/certfile'
