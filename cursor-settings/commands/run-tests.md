# Run Tests

Run the complete test suite for both backend and frontend.

## Backend Tests
```bash
cd backend
source venv/bin/activate
pytest -v
```

## Frontend Tests
```bash
cd frontend
npm test
```

## All Tests
```bash
# Backend
cd backend && source venv/bin/activate && pytest -v

# Frontend (in new terminal)
cd frontend && npm test
```

## Test Coverage
```bash
# Backend with coverage
cd backend
source venv/bin/activate
pytest --cov=glossary --cov-report=html
```
