# Demo Instructions

## Quick Demo Launch

To see Termageddon in action, simply run:

```bash
./demo.sh
```

## What the Demo Script Does

1. **Resets the Database**
   - Deletes existing `db.sqlite3`
   - Runs fresh migrations
   - Loads 360 test entries from CSV
   - Creates 10 test users
   - Sets up domain experts

2. **Starts Backend Server**
   - Activates Python virtual environment
   - Starts Django on `http://localhost:8000`
   - Runs in background

3. **Starts Frontend Server**
   - Starts Angular dev server on `http://localhost:4200`
   - Compiles application
   - Runs in background

4. **Waits for Servers**
   - Checks backend readiness
   - Checks frontend readiness (may take 30-60 seconds to compile)

5. **Opens Chrome**
   - Opens `http://localhost:8000/admin/` (Django admin)
   - Opens `http://localhost:4200` (Frontend app)

## What You'll See

### Tab 1: Django Admin (`http://localhost:8000/admin/`)
- Login with: `admin` / `admin`
- Full CRUD interface for all models
- Bulk actions for approvals and management
- View all 360 entries, domains, users, etc.

### Tab 2: Frontend App (`http://localhost:4200`)
- Login with any of these (password = username):
  - **Admin:** `admin` / `admin`
  - **User:** `maria.flores` / `maria.flores`
  - **User:** `ben.carter` / `ben.carter`
  - **User:** `leo.schmidt` / `leo.schmidt`
  - **User:** `evelyn.reed` / `evelyn.reed`
  - **User:** `kenji.tanaka` / `kenji.tanaka`
  - **User:** `sofia.rossi` / `sofia.rossi`
  - **User:** `aisha.khan` / `aisha.khan`
  - **User:** `samuel.greene` / `samuel.greene`
  - **User:** `ivan.petrov` / `ivan.petrov`
  - **User:** `chloe.dubois` / `chloe.dubois`
- Browse 360 glossary entries
- Search by term name
- Filter by domain
- View definitions with approval status
- See approver avatars

## Stopping the Demo

Press **Ctrl+C** in the terminal where `demo.sh` is running.

The script will automatically:
- Stop the backend server
- Stop the frontend server
- Clean up background processes

## Manual Cleanup (if needed)

If you need to manually stop servers:

```bash
# Find and kill Django server
lsof -ti:8000 | xargs kill -9

# Find and kill Angular server
lsof -ti:4200 | xargs kill -9
```

## Troubleshooting

### "Permission denied" when running demo.sh
```bash
chmod +x demo.sh
./demo.sh
```

### Ports already in use
Make sure no other services are using ports 8000 or 4200:
```bash
lsof -ti:8000 | xargs kill -9
lsof -ti:4200 | xargs kill -9
./demo.sh
```

### Chrome doesn't open automatically
The script will show URLs to open manually:
- `http://localhost:8000/admin/`
- `http://localhost:4200`

### Frontend takes too long to start
The Angular build process can take 30-60 seconds on first run. Be patient!

### Database errors
Delete and re-run:
```bash
rm backend/db.sqlite3
./demo.sh
```

## Demo Data

The script loads:
- **360 entries** across 9 domains
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
- **Domain experts** assigned to each domain
- **Approved versions** (2 approvals each)

## Test Scenarios

### 1. Browse Glossary
1. Login to frontend (`http://localhost:4200`)
2. Use search box to find "API" or "atom"
3. Click domain filter to see terms by domain
4. Click on any term to view its definition

### 2. Admin Interface
1. Login to admin (`http://localhost:8000/admin/`)
2. Click "Entrys" to see all entries
3. Use filters on the right sidebar
4. Try bulk actions (select entries, choose action from dropdown)

### 3. User Permissions
1. Login as `maria.flores` / `maria.flores`
2. Notice domain expert badge in header
3. Try searching and filtering
4. Logout and login as different user

### 4. API Testing
With servers running from demo.sh:
```bash
# Get token
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin"}'

# Use token to query entries
curl -X GET "http://localhost:8000/api/entries/?search=API" \
  -H "Authorization: Token YOUR_TOKEN_HERE"
```

## After the Demo

When you're done:
1. Press **Ctrl+C** to stop the demo
2. Both servers will shut down cleanly
3. Database remains intact (unless you run demo.sh again)

To restart without resetting database:
```bash
# Terminal 1
cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt && python manage.py runserver

# Terminal 2
cd frontend && npm start
```

## Features to Try

✅ **Working Now:**
- Login/logout
- Browse 360 entries
- Search and filter
- View definitions
- See approval status
- Admin interface
- API endpoints

⏭️ **Not Yet Implemented:**
- Create/edit definitions (editor component)
- Approve versions (review dashboard)
- Add comments (comment UI)
- View version history
- Internal linking

## Need Help?

- See `QUICKSTART.md` for manual setup
- See `STATUS.md` for complete project status
- See `backend/README.md` for API documentation
- See `frontend/README.md` for frontend details

Enjoy the demo! 🎉

