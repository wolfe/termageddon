# Run Tests

Run the complete test suite for both backend and frontend.

## Backend Tests
```bash
cd backend
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
cd backend && pytest -v

# Frontend (in new terminal)
cd frontend && npm test
```

## Test Coverage
```bash
# Backend with coverage
cd backend
pytest --cov=glossary --cov-report=html
```
