#!/bin/bash
set -e

echo "Starting Termageddon backend entrypoint..."

# Wait for database to be ready (only if DB_HOST is set, otherwise use SQLite)
if [ -n "${DB_HOST}" ]; then
  echo "Waiting for PostgreSQL database..."
  until PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" -c '\q' 2>/dev/null; do
    echo "Database is unavailable - sleeping"
    sleep 1
  done
  echo "Database is up - executing commands"
else
  echo "No DB_HOST set, using SQLite database"
fi

# Run migrations
echo "Running database migrations..."
python manage.py migrate --noinput

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

# Create superuser if it doesn't exist (for dev environments)
if [ "${ENVIRONMENT}" = "dev" ] && [ -n "${DJANGO_SUPERUSER_USERNAME}" ]; then
  echo "Creating superuser if needed..."
  python manage.py shell << EOF
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username="${DJANGO_SUPERUSER_USERNAME}").exists():
    User.objects.create_superuser(
        "${DJANGO_SUPERUSER_USERNAME}",
        "${DJANGO_SUPERUSER_EMAIL:-admin@example.com}",
        "${DJANGO_SUPERUSER_PASSWORD}"
    )
    print("Superuser created")
else:
    print("Superuser already exists")
EOF
fi

# Execute the main command
echo "Starting application..."
exec "$@"
