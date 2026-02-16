#!/bin/bash
# EduShare - Quick run script

# Virtual environment ni aktivlashtirish
source venv/bin/activate

# Django kommandasini bajarish
python manage.py "$@"
