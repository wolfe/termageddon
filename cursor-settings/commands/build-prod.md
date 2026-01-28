# Build for Production

Build both backend and frontend for production deployment.

## Frontend Build
```bash
cd frontend
npm run build
```
Output will be in `dist/frontend/`

## Backend Production Setup
```bash
cd backend

# Install production dependencies
pip install -r requirements.txt

# Collect static files
python manage.py collectstatic --noinput

# Run migrations
python manage.py migrate

# Create superuser (if needed)
python manage.py createsuperuser
```

## Production Environment Variables
Set these environment variables for production:
- `SECRET_KEY` - Django secret key
- `DEBUG=False`
- `ALLOWED_HOSTS` - Comma-separated list of allowed hosts
- `DATABASE_URL` - Database connection string (if using PostgreSQL)

## Static Files
Static files will be collected in `backend/staticfiles/` directory.
