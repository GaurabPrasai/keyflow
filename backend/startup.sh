#!/usr/bin/env bash
# Azure App Service startup command: bash startup.sh
set -o errexit

echo "Applying database migrations"
python manage.py migrate --noinput

echo "Collecting static files"
python manage.py collectstatic --noinput

echo "Starting gunicorn on :8000"
exec gunicorn backend.wsgi:application \
  --bind=0.0.0.0:8000 \
  --workers 2 \
  --threads 4 \
  --timeout 60 \
  --access-logfile - \
  --error-logfile -
