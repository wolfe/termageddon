# Termageddon Backend API

A production-ready glossary management REST API built with Django and Django REST Framework.

## Features

- **Complete CRUD operations** for perspectives, terms, entries, and versions
- **Approval workflow** requiring 2 approvals for entry versions
- **Perspective curator system** for managing specialized knowledge areas
- **Comment system** with threaded replies
- **Soft delete** functionality for all models
- **Token-based authentication**
- **Comprehensive test coverage** (90%+)
- **Admin interface** with custom actions

## Tech Stack

- Django 5.1.4
- Django REST Framework 3.16.0
- Django CORS Headers 4.7.0
- Django Filters 25.1
- SQLite database
- pytest + pytest-django for testing
- factory-boy for test fixtures

## Installation

### Prerequisites

- Python 3.13+
- pip

### Setup

1. **Clone the repository and navigate to backend:**

   ```bash
   cd backend
   ```

2. **Create and activate virtual environment:**

   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

   **Note**: If you're using the demo script (`../demo.sh`), it will automatically create the virtual environment and install dependencies for you.

4. **Environment configuration:**

   The `.env` file is already created with a SECRET_KEY. In production, generate a new one:

   ```bash
   python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
   ```

5. **Run migrations:**

   ```bash
   python manage.py migrate
   ```

6. **Collect static files:**

   ```bash
   python manage.py collectstatic
   ```

7. **Load test data:**

   ```bash
   python manage.py load_test_data
   ```

   This creates:
   - Superuser: `admin` / `admin`
   - 10 test users with credentials: `<username>` / `<username>` (e.g., `maria.flores` / `maria.flores`)
   - 9 perspectives (Physics, Chemistry, Biology, etc.)
   - 360 entries with approved versions

8. **Run the development server:**

   ```bash
   python manage.py runserver
   ```

   API is now available at: `http://localhost:8000/api/`

## API Endpoints

### Authentication

- `POST /api/auth/login/` - Login (returns token and user info)
- `POST /api/auth/logout/` - Logout (deletes token)
- `GET /api/auth/me/` - Get current user info

### Core Resources

- `GET/POST /api/perspectives/` - List/create perspectives
- `GET/POST /api/terms/` - List/create terms
- `GET/POST /api/entries/` - List/create entries
- `GET/POST /api/entry-versions/` - List/create entry versions
- `GET/POST /api/comments/` - List/create comments
- `GET/POST /api/perspective-curators/` - List/create perspective curators (staff only)

### Custom Actions

- `POST /api/entries/{id}/mark_official/` - Mark entry as official (requires perspective curator or staff)
- `POST /api/entry-versions/{id}/approve/` - Approve a version
- `POST /api/comments/{id}/resolve/` - Resolve a comment
- `POST /api/comments/{id}/unresolve/` - Unresolve a comment

### Filtering and Search

- **Perspectives**: Search by name/description
- **Terms**: Filter by `is_official`, search by text
- **Entries**: Filter by `perspective` and `is_official`, search by term text
- **Entry Versions**: Filter by `entry` and `author`
- **Comments**: Filter by `content_type`, `object_id`, `is_resolved`, `parent`

## Authentication

All API endpoints (except login) require token authentication. Include the token in the Authorization header:

```
Authorization: Token <your-token-here>
```

### Example Login Flow

```bash
# Login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "maria.flores", "password": "maria.flores"}'

# Response:
{
  "token": "abc123...",
  "user": {
    "id": 2,
    "username": "maria.flores",
    "first_name": "Maria",
    "last_name": "Flores",
    "is_staff": false,
    "perspective_curator_for": [1, 3]
  }
}

# Use token in subsequent requests
curl -X GET http://localhost:8000/api/entries/ \
  -H "Authorization: Token abc123..."
```

## Data Models

### Perspective
Represents a knowledge area (e.g., Physics, Chemistry)

### Term
A term in the glossary (globally unique)

### Entry
A (term, perspective) pair representing a definition

### EntryVersion
A versioned definition that requires approval

### Comment
Threaded comments attachable to any model

### PerspectiveCurator
Tracks which users are curators for which perspectives

## Permissions

- **Authenticated users**: Can view and create most resources
- **Perspective curators**: Can mark entries as official for their perspectives
- **Staff users**: Full access to all resources and admin actions

## Testing

Run the test suite:

```bash
pytest
```

Run with coverage:

```bash
pytest --cov=glossary --cov-report=html
```

Run specific test file:

```bash
pytest glossary/tests/test_models.py -v
```

## Admin Interface

Access the Django admin at: `http://localhost:8000/admin/`

Login with superuser credentials: `admin` / `admin`

Features:
- View and manage all models
- Custom actions: soft delete, undelete, mark as official, bulk approve
- Inline editing for entry versions
- Filter and search capabilities

## Code Quality

Format code with Black:

```bash
black glossary/ Termageddon/
```

## Project Structure

```
backend/
├── glossary/               # Main app
│   ├── models.py          # Data models with soft delete
│   ├── serializers.py     # DRF serializers
│   ├── views.py           # API ViewSets and auth endpoints
│   ├── urls.py            # URL routing
│   ├── admin.py           # Admin customizations
│   ├── tests/             # Test suite
│   │   ├── conftest.py    # Test fixtures and factories
│   │   ├── test_models.py # Model tests
│   │   ├── test_views.py  # API endpoint tests
│   │   └── test_serializers.py  # Serializer tests
│   └── management/
│       └── commands/
│           └── load_test_data.py  # Data loading command
├── Termageddon/           # Project settings
│   ├── settings.py        # Django configuration
│   └── urls.py            # Root URL configuration
├── requirements.txt       # Python dependencies
├── pytest.ini            # pytest configuration
└── db.sqlite3            # SQLite database
```

## Key Features Explained

### Soft Delete

All models inherit from `AuditedModel` which provides soft delete functionality:
- `delete()` - Soft deletes (sets `is_deleted=True`)
- `hard_delete()` - Permanently deletes
- `objects` - Excludes soft-deleted records
- `all_objects` - Includes soft-deleted records

### Approval Workflow

Entry versions require 2 approvals (configurable via `MIN_APPROVALS` in settings):
1. Author creates a version
2. Two other users approve it
3. Upon reaching MIN_APPROVALS, the version automatically becomes active
4. Authors cannot approve their own versions
5. Users can only have one unapproved version per entry

### Signals

The system uses Django signals to automatically activate approved versions when they receive sufficient approvals.

## API Response Format

Paginated list responses:

```json
{
  "count": 360,
  "next": "http://localhost:8000/api/entries/?page=2",
  "previous": null,
  "results": [...]
}
```

Nested relationships in read operations:

```json
{
  "id": 1,
  "term": {
    "id": 1,
    "text": "API",
    "is_official": true
  },
  "perspective": {
    "id": 1,
    "name": "Computer Science"
  },
  "active_version": {
    "id": 1,
    "content": "<p>Application Programming Interface</p>",
    "author": {...},
    "is_approved": true,
    "approval_count": 2
  }
}
```

## Troubleshooting

**Issue**: ModuleNotFoundError when running tests
- **Solution**: Ensure you're in the backend directory and virtual environment is activated

**Issue**: Database is locked
- **Solution**: Close any other processes accessing the database, or delete `db.sqlite3` and re-run migrations

**Issue**: CORS errors from frontend
- **Solution**: Ensure `CORS_ALLOWED_ORIGINS` in `settings.py` includes your frontend URL

## Development

To add new models:
1. Define model in `models.py`
2. Create serializers in `serializers.py`
3. Create ViewSet in `views.py`
4. Register in `urls.py`
5. Add to `admin.py`
6. Write tests
7. Run migrations

## Production Considerations

Before deploying to production:

1. Generate a new `SECRET_KEY`
2. Set `DEBUG = False`
3. Configure `ALLOWED_HOSTS`
4. Use PostgreSQL instead of SQLite
5. Configure static file serving
6. Set up HTTPS
7. Use environment variables for sensitive settings
8. Configure proper CORS settings
9. Set up logging
10. Use gunicorn or similar WSGI server

## License

This project is for educational purposes.
