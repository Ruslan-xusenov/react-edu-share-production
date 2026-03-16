"""
Gunicorn configuration file for EduShare — optimized for production
"""
import multiprocessing
import os

# ── Server Socket ──────────────────────────────────────────────────────────
bind = '127.0.0.1:8000'
backlog = 2048

# ── Worker Processes ───────────────────────────────────────────────────────
# Sync workers are fine for I/O-bound Django apps behind Nginx.
# Formula: (2 × CPU cores) + 1
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = 'sync'
worker_connections = 1000

# Restart workers after N requests to prevent memory leaks
max_requests = 1200
max_requests_jitter = 100

# Kill a worker if it does not respond within this many seconds
timeout = 120         # reduced from 300 — video uploads handled by Nginx

# Graceful shutdown: wait this many seconds before forcing
graceful_timeout = 30

# TCP keep-alive time in seconds
keepalive = 5

# ── Logging ────────────────────────────────────────────────────────────────
accesslog = '/var/log/edushare/gunicorn-access.log'
errorlog  = '/var/log/edushare/gunicorn-error.log'
loglevel  = 'warning'   # 'info' in dev; 'warning' in prod to reduce I/O
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

# ── Process Naming ─────────────────────────────────────────────────────────
proc_name = 'edushare'

# ── Server Mechanics ───────────────────────────────────────────────────────
daemon  = False
pidfile = '/var/run/edushare/gunicorn.pid'
user    = None
group   = None
tmp_upload_dir = None

# Pre-load app before forking workers (shares memory via CoW, saves RAM)
preload_app = True