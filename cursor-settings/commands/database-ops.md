# Database Operations

Manage the database and test data.

## Reset Database
```bash
cd backend
python manage.py reset_test_db
```

## Load Test Data
```bash
cd backend
python manage.py load_test_data
```

## Run Migrations
```bash
cd backend
python manage.py migrate
```

## Create Superuser
```bash
cd backend
python manage.py createsuperuser
```

## Database Shell
```bash
cd backend
python manage.py shell
```

## Admin Interface
Access at: http://localhost:8000/admin/
Login: admin / admin
