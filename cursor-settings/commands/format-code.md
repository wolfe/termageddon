# Format Code

Format code using the project's formatting tools.

## Format All Code
```bash
# Backend (Python)
cd backend
black glossary/ Termageddon/
isort glossary/ Termageddon/

# Frontend (TypeScript/SCSS/Markdown)
cd frontend
npx prettier --write "src/**/*.{ts,html,scss,css,json}" "../**/*.md" --parser markdown
```

## Check Formatting
```bash
# Backend
cd backend
black --check glossary/ Termageddon/
isort --check-only glossary/ Termageddon/

# Frontend
cd frontend
npx prettier --check "src/**/*.{ts,html,scss,css,json}" "../**/*.md" --parser markdown
```

## Fix Linting Issues
```bash
# Frontend
cd frontend
npm run lint:fix
```
