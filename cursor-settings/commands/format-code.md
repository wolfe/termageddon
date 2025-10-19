# Format Code

Format code using the project's formatting tools.

## Format All Code
```bash
# Backend (Python)
cd backend
source venv/bin/activate
black glossary/ Termageddon/

# Frontend (TypeScript/SCSS)
cd frontend
npm run format
```

## Check Formatting
```bash
# Backend
cd backend
source venv/bin/activate
black --check glossary/ Termageddon/

# Frontend
cd frontend
npm run format:check
```

## Fix Linting Issues
```bash
# Frontend
cd frontend
npm run lint:fix
```
