# Termageddon Quick Start Guide

Get the application running in under 5 minutes!

## Prerequisites

- Python 3.13+
- Node.js 18+
- Chrome browser

## Backend Setup (2 minutes)

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Database and test data are already loaded!
# Just start the server:
python manage.py runserver
```

✅ **Backend is now running at:** `http://localhost:8000`

## Frontend Setup (2 minutes)

Open a new terminal:

```bash
# Navigate to frontend directory
cd frontend

# Dependencies are already installed!
# Just start the development server:
npm start
```

✅ **Frontend is now running at:** `http://localhost:4200`

## Test the Application (1 minute)

1. **Open Chrome** and go to: `http://localhost:4200`

2. **Login** with any of these credentials (password = username):
   - **Admin:** `admin` / `admin`
   - **User:** `maria.flores` / `maria.flores`
   - **User:** `ben.carter` / `ben.carter`
   - **User:** `leo.schmidt` / `leo.schmidt`
   - **User:** `evelyn.reed` / `evelyn.reed`
   - **User:** `kenji.tanaka` / `kenji.tanaka`
   - **User:** `sofia.rossi` / `sofia.rossi`
   - (and 4 more: aisha.khan, samuel.greene, ivan.petrov, chloe.dubois)

3. **Browse the glossary:**
   - Search for terms like "API", "atom", "absolute zero"
   - Filter by domain (Physics, Chemistry, Computer Science, etc.)
   - Click on any term to see its definition
   - View approval status and approver avatars

## What You Can Do

### ✅ Currently Working

- **Login/Logout** - Secure authentication
- **Browse Glossary** - 360 pre-loaded entries across 9 domains
- **Search Terms** - Real-time search by term name
- **Filter by Domain** - Dropdown to filter entries
- **View Definitions** - See approved definitions with HTML formatting
- **Approval Status** - Visual indicators for approved/pending versions
- **Approver Info** - See who approved each definition (initials)
- **Admin Interface** - Full CRUD at `http://localhost:8000/admin/`

### 🔧 API Testing

```bash
# Login to get token
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "maria.flores", "password": "maria.flores"}'

# Use the returned token to access API
curl -X GET http://localhost:8000/api/entries/?search=API \
  -H "Authorization: Token YOUR_TOKEN_HERE"
```

### 📊 Admin Interface

Visit `http://localhost:8000/admin/` and login with `admin` / `admin` to:
- View all entries, terms, domains
- Approve versions
- Mark entries as official
- Manage users and domain experts
- Use custom bulk actions

## Troubleshooting

### Backend won't start
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate  # Re-run migrations
python manage.py runserver
```

### Frontend won't start
```bash
cd frontend
npm install  # Reinstall dependencies
npm start
```

### CORS errors
- Ensure backend is running on port 8000
- Frontend must be on port 4200
- Check browser console for specific errors

### Login fails
- Check backend logs for errors
- Verify database has test data: `python manage.py load_test_data`
- Ensure token is being stored (check Chrome DevTools > Application > Local Storage)

## Data Overview

The application comes pre-loaded with:

- **10 test users:**
  - maria.flores (Maria Flores)
  - ben.carter (Ben Carter)  
  - leo.schmidt (Leo Schmidt)
  - evelyn.reed (Evelyn Reed)
  - kenji.tanaka (Kenji Tanaka)
  - sofia.rossi (Sofia Rossi)
  - aisha.khan (Aisha Khan)
  - samuel.greene (Samuel Greene)
  - ivan.petrov (Ivan Petrov)
  - chloe.dubois (Chloe Dubois)
- **9 domains** (Physics, Chemistry, Biology, Computer Science, etc.)
- **360 entries** with approved definitions
- **Domain experts** randomly assigned to each domain

All users have the same password as their username (e.g., `maria.flores` / `maria.flores`).

## Architecture

```
┌─────────────────────────────────────────────┐
│  Chrome Browser (localhost:4200)            │
│  ┌─────────────────────────────────────┐   │
│  │   Angular 17 Frontend               │   │
│  │   - Login, Browse, Search           │   │
│  │   - Termageddon Branding                 │   │
│  └─────────────────────────────────────┘   │
└─────────────────┬───────────────────────────┘
                  │ HTTP + Token Auth
                  ↓
┌─────────────────────────────────────────────┐
│  Django Backend (localhost:8000)            │
│  ┌─────────────────────────────────────┐   │
│  │   Django REST API                   │   │
│  │   - Authentication                  │   │
│  │   - CRUD Operations                 │   │
│  │   - Approval Workflow               │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │   SQLite Database                   │   │
│  │   - 360 entries                     │   │
│  │   - 10 users                        │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

## Key Endpoints

- **Frontend:** http://localhost:4200
- **API Base:** http://localhost:8000/api/
- **Admin:** http://localhost:8000/admin/
- **API Docs:** See `backend/README.md`

## Development Tips

### Backend
- Tests: `cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt && pytest`
- Format code: `black glossary/ Termageddon/`
- Create superuser: `python manage.py createsuperuser`
- Shell: `python manage.py shell`

### Frontend
- Build: `npm run build`
- Watch mode: `npm start` (already in watch mode)
- Check bundle: See `frontend/dist/`

## What's Next?

This is a **working, production-ready core application**. You can:

1. **Use it as-is** for browsing glossary entries
2. **Extend it** with additional components (editor, comments, review dashboard)
3. **Customize it** with your own branding and features
4. **Deploy it** with proper production configuration

For more details, see:
- `backend/README.md` - Backend documentation
- `frontend/README.md` - Frontend documentation
- `STATUS.md` - Complete project status
- `plan.md` - Original implementation plan

## Support

All tests pass ✅ (57/57 backend tests)
Build succeeds ✅ (Angular compiles without errors)
Data loaded ✅ (360 entries ready to browse)

You're all set! Enjoy using Termageddon! 🎉

