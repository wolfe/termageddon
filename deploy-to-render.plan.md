<!-- e3260181-1464-4f4d-9ed5-bbf3dc62d4b6 754e159e-902c-46f5-995e-3e3b1326e31d -->
# Deploy Termageddon to Render.com

## Overview

Deploy both Django backend and Angular frontend to Render.com's free tier for test purposes. The application will use SQLite for data storage and support test user credentials.

## Prerequisites

- Git repository (push current code to GitHub/GitLab)
- Render.com account (free)

## Implementation Steps

### 1. Backend Deployment Configuration

**Create `backend/render.yaml`**

```yaml
services:
 - type: web
    name: termageddon-backend
    env: python
    buildCommand: "pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate"
    startCommand: "gunicorn Termageddon.wsgi:application"
    envVars:
   - key: PYTHON_VERSION
        value: 3.13.1
   - key: SECRET_KEY
        generateValue: true
   - key: DEBUG
        value: False
   - key: ALLOWED_HOSTS
        sync: false
```

**Update `backend/requirements.txt`**

Add production dependencies:

```
gunicorn==23.0.0
whitenoise==6.8.2
```

**Update `backend/Termageddon/settings.py`**

Add production settings:

```python
# Parse ALLOWED_HOSTS from environment
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# Use DEBUG from environment
DEBUG = os.getenv('DEBUG', 'False') == 'True'

# Add WhiteNoise for static files
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Add this
    # ... rest of middleware
]

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# CORS settings for production
CORS_ALLOWED_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:4200').split(',')
```

**Create `backend/.gitignore` entries**

Ensure these are ignored:

```
db.sqlite3
*.pyc
__pycache__/
.env
```

### 2. Frontend Deployment Configuration

**Update `frontend/src/app/services/base.service.ts`**

Make API URL environment-aware:

```typescript
private apiUrl = environment.production
  ? 'https://termageddon-backend.onrender.com/api'
  : 'http://localhost:8000/api';
```

**Create `frontend/src/environments/environment.prod.ts`**

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://termageddon-backend.onrender.com/api'
};
```

**Create static server configuration `frontend/serve.json`**

```json
{
  "routes": {
    "/**": "index.html"
  }
}
```

### 3. Deploy on Render.com

**Backend Deployment:**

1. Push code to Git repository
2. In Render dashboard, create "New Web Service"
3. Connect repository, select `backend` directory
4. Use settings from `render.yaml` or configure:

                                                                                                                                                                                                                                                                                                                                                                                                - Build Command: `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
                                                                                                                                                                                                                                                                                                                                                                                                - Start Command: `gunicorn Termageddon.wsgi:application`

5. Add environment variables:

                                                                                                                                                                                                                                                                                                                                                                                                - `SECRET_KEY`: (auto-generate)
                                                                                                                                                                                                                                                                                                                                                                                                - `DEBUG`: `False`
                                                                                                                                                                                                                                                                                                                                                                                                - `ALLOWED_HOSTS`: `termageddon-backend.onrender.com`
                                                                                                                                                                                                                                                                                                                                                                                                - `CORS_ORIGINS`: `https://termageddon-frontend.onrender.com`

**Frontend Deployment:**

1. In Render dashboard, create "Static Site"
2. Connect repository, select `frontend` directory
3. Configure:

                                                                                                                                                                                                                                                                                                                                                                                                - Build Command: `npm install && npm run build`
                                                                                                                                                                                                                                                                                                                                                                                                - Publish Directory: `dist/frontend/browser`

4. Add rewrite rule for SPA routing in Render settings

### 4. Initialize Test Data

**Create test users via Django admin:**

1. Access `https://termageddon-backend.onrender.com/admin`
2. Create superuser using Render shell: `python manage.py createsuperuser`
3. Create test user accounts with credentials to distribute

**Or use management command:**

Create `backend/glossary/management/commands/create_test_users.py`:

```python
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User

class Command(BaseCommand):
    def handle(self, *args, **options):
        users = [
            ('testuser1', 'test123', 'test1@example.com'),
            ('testuser2', 'test123', 'test2@example.com'),
        ]
        for username, password, email in users:
            if not User.objects.filter(username=username).exists():
                User.objects.create_user(username, email, password)
                self.stdout.write(f'Created {username}')
```

Run via Render shell: `python manage.py create_test_users`

### 5. Testing & Access

**Test the deployment:**

- Backend API: `https://termageddon-backend.onrender.com/api/`
- Frontend: `https://termageddon-frontend.onrender.com/`
- Django Admin: `https://termageddon-backend.onrender.com/admin/`

**Distribute credentials:**

Share the frontend URL and test credentials with users.

## Notes

- Render free tier spins down after inactivity (first request takes 30s to wake up)
- SQLite data persists on the server disk
- For better persistence, consider upgrading to paid plan or using managed PostgreSQL
- Monitor usage in Render dashboard to stay within free tier limits
