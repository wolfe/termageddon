# Lint Code

Run comprehensive linting and type checking on the codebase.

## Backend Linting (Python)
```bash
cd backend

# Run pre-commit on all files (runs black, isort, flake8, mypy)
pre-commit run --all-files

# Or run individual manual checks:
# Type checking with mypy (if not using pre-commit)
mypy glossary/ Termageddon/

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
# Backend (pre-commit checks - recommended)
cd backend && pre-commit run --all-files

# Backend (manual mypy only, if needed)
cd backend && mypy glossary/ Termageddon/

# Frontend
cd frontend && npm run lint && npx tsc --noEmit && npm run format:check
```

## Fix Linting Issues
```bash
# Backend - Auto-fix with pre-commit (recommended)
cd backend
pre-commit run --all-files

# Or manually fix formatting:
black glossary/ Termageddon/

# Frontend - Auto-fix what's possible
cd frontend
npm run lint:fix
npm run format
```
