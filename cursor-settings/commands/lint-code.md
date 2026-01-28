# Lint Code

Run comprehensive linting and type checking on the codebase.

## Backend Linting (Python)
```bash
cd backend

# Type checking with mypy
mypy glossary/ Termageddon/

# Code style and quality with flake8
flake8 glossary/ Termageddon/

# Import sorting check
isort --check-only glossary/ Termageddon/

# Code formatting check
black --check glossary/ Termageddon/
```

## Frontend Linting (TypeScript/Angular)
```bash
cd frontend

# ESLint for code quality
npm run lint

# TypeScript type checking
npx tsc --noEmit

# Prettier formatting check
npm run format:check
```

## All Linting (Complete Check)
```bash
# Backend
cd backend && \
mypy glossary/ Termageddon/ && \
flake8 glossary/ Termageddon/ && \
isort --check-only glossary/ Termageddon/ && \
black --check glossary/ Termageddon/

# Frontend (in new terminal)
cd frontend && npm run lint && npx tsc --noEmit && npm run format:check
```

## Fix Linting Issues
```bash
# Backend - Auto-fix what's possible
cd backend
black glossary/ Termageddon/
isort glossary/ Termageddon/

# Frontend - Auto-fix what's possible
cd frontend
npm run lint:fix
npm run format
```
