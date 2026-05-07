set -e

systemctl stop edushare || true

sudo -u postgres psql << EOF
-- Eski ulanishlarni uzamiz
SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'edushare_db' AND pid <> pg_backend_pid();

-- Eski bazani o'chiramiz
DROP DATABASE IF EXISTS edushare_db;

-- Yangi foydalanuvchi va baza yaratamiz
CREATE USER edushare_user WITH PASSWORD 'edushare_db_2026';
CREATE DATABASE edushare_db OWNER edushare_user;
GRANT ALL PRIVILEGES ON DATABASE edushare_db TO edushare_user;
EOF

echo "Ma'lumotlar bazasi va foydalanuvchi muvaffaqiyatli yaratildi!"