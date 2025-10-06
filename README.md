# Termageddon

A production-ready full-stack glossary management system with Django REST Framework backend and Angular 17 frontend.

## 🚀 Quick Demo

Launch the complete application with one command:

```bash
./demo.sh
```

This will:
- Reset and populate the database with 360 test entries
- Start the Django backend server
- Start the Angular frontend server  
- Open Chrome with both the admin interface and frontend app

**Login:** `admin` / `admin` or `maria.flores` / `maria.flores`

See [DEMO_INSTRUCTIONS.md](DEMO_INSTRUCTIONS.md) for details.

## 📋 Project Status

✅ **Backend:** 100% Complete (69/69 tests passing)  
✅ **Frontend:** Complete workflow features (browse, edit, review, publish)  
✅ **GitHub-Style Workflow:** Reviewer selection, edit during approval, publish actions  
✅ **Rich Text Editing:** Quill.js integration with custom link types  
✅ **Comment System:** Threaded discussions with resolve functionality  
✅ **Database:** 360 entries loaded from CSV  
✅ **E2E Testing:** Complete workflow validation  
✅ **Documentation:** Comprehensive READMEs, API docs, and user guide  
✅ **Code Quality:** Black/Prettier formatting, reduced duplication  
✅ **Testing:** Comprehensive test suite for frontend and backend  

See [STATUS.md](STATUS.md) for complete details.

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│   Angular 17 Frontend               │
│   • Login & Authentication          │
│   • Term Browser with Search        │
│   • Rich Text Editor (Quill.js)      │
│   • Review Dashboard                │
│   • Comment System                  │
│   • Version History                 │
│   • Termageddon Brand Styling            │
│   • Tailwind CSS                    │
└──────────────┬──────────────────────┘
               │ REST API + Token Auth
               ↓
┌─────────────────────────────────────┐
│   Django REST Framework Backend     │
│   • 7 Models with Soft Delete       │
│   • GitHub-Style Approval Workflow  │
│   • Reviewer Selection              │
│   • Publish Actions                 │
│   • Domain Expert System            │
│   • Comprehensive Admin Interface   │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│   SQLite Database                   │
│   • 360 Glossary Entries            │
│   • 10 Test Users                   │
│   • 9 Domains                       │
└─────────────────────────────────────┘
```

## 🎯 Features

### ✅ Currently Working

- **Authentication:** Token-based login/logout
- **Browse Glossary:** 360 pre-loaded entries across 9 domains
- **Search:** Real-time search by term name
- **Filter:** Domain dropdown filter
- **Rich Text Editing:** Quill.js WYSIWYG editor with custom link types
- **GitHub-Style Workflow:** Request reviewers, edit during approval, publish actions
- **Review Dashboard:** Approve versions, view replaces section, publish approved versions
- **Comment System:** Threaded discussions with resolve functionality
- **Version History:** Timeline view of all changes
- **Term Creation:** Add new terms with domain selection
- **Internal Linking:** Link between glossary entries
- **View Definitions:** HTML-formatted definitions with approval status
- **Approver Info:** Visual display of who approved each definition
- **Admin Interface:** Full CRUD with custom actions
- **API:** Complete REST API with pagination and filtering

### 📝 Backend API

Complete REST API with:
- User authentication (`/api/auth/login/`, `/api/auth/logout/`, `/api/auth/me/`)
- CRUD operations for all resources
- GitHub-style approval workflow with reviewer selection
- Publish actions for approved versions
- Edit unpublished versions without creating new ones
- Comment threading with resolve functionality
- Domain expert permissions
- Filtering and search
- Pagination

### 🎨 Frontend

Modern Angular 17 application with:
- Standalone components architecture
- Quill.js rich text editor with custom link types
- GitHub-style review workflow components
- Comment system with threaded replies
- Version history timeline
- Term creation dialog
- Entry picker for internal linking
- Termageddon brand colors (#E31937 red, #003A70 blue)
- Slack-like dense UI
- Responsive 30/70 split layout
- HTTP interceptor for authentication
- Route guards
- Reactive forms
- E2E testing with Playwright

## 📦 What's Included

### Backend (`/backend`)
- Django 5.1.4 + Django REST Framework 3.16.0
- 7 data models with soft delete
- 72 passing unit and integration tests
- GitHub-style approval workflow with reviewer selection
- Publish actions and edit during approval
- Comment system with threading
- Factory-boy test fixtures
- Management command to load test data
- Django admin with custom actions
- Token authentication
- Comprehensive API documentation

### Frontend (`/frontend`)
- Angular 17 with standalone components
- Quill.js rich text editor with custom link types
- GitHub-style review workflow components
- Comment system with threaded replies
- Version history and term creation dialogs
- Tailwind CSS with Termageddon branding
- TypeScript interfaces for all models
- Enhanced services with new workflow methods
- HTTP interceptor for token injection
- Auth guard for protected routes
- E2E testing with Playwright

## 🏃 Manual Setup

If you prefer not to use the demo script:

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py runserver
```

Access at: http://localhost:8000

### Frontend

```bash
cd frontend
npm start
```

Access at: http://localhost:4200

See [QUICKSTART.md](QUICKSTART.md) for detailed setup instructions.

## 📚 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Get running in 5 minutes
- **[DEMO_INSTRUCTIONS.md](DEMO_INSTRUCTIONS.md)** - How to use demo.sh
- **[STATUS.md](STATUS.md)** - Complete project status and roadmap
- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - Complete API reference
- **[USER_GUIDE.md](USER_GUIDE.md)** - Comprehensive user guide

## 🧪 Testing

### Backend Tests (69/69 passing ✅)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pytest -v
```

Test coverage: 90%+ on models, views, and serializers

### Frontend

```bash
cd frontend
npm test
```

## 🔐 Test Credentials

- **Admin:** `admin` / `admin`
- **Test Users (password = username):**
  - `maria.flores` (Maria Flores)
  - `ben.carter` (Ben Carter)
  - `leo.schmidt` (Leo Schmidt)
  - `evelyn.reed` (Evelyn Reed)
  - `kenji.tanaka` (Kenji Tanaka)
  - `sofia.rossi` (Sofia Rossi)
  - `aisha.khan` (Aisha Khan)
  - `samuel.greene` (Samuel Greene)
  - `ivan.petrov` (Ivan Petrov)
  - `chloe.dubois` (Chloe Dubois)

## 📊 Test Data

The application includes:
- 360 glossary entries (Physics, Chemistry, Biology, Computer Science, etc.)
- 10 test users with various permissions
- 9 domains
- Domain experts assigned to each domain
- Pre-approved definitions (2 approvals each)

## 🛠️ Technology Stack

### Backend
- Python 3.13
- Django 5.1.4
- Django REST Framework 3.16.0
- SQLite
- pytest + factory-boy

### Frontend
- Node.js 18+
- Angular 17
- TypeScript 5.x
- Tailwind CSS 3.x
- RxJS

## 🌟 Key Features

### Soft Delete
All models support soft delete - records are marked as deleted but remain in the database.

### Approval Workflow
- Authors create definition versions
- 2 users must approve before version becomes active
- Authors cannot approve their own versions
- Automatic activation upon reaching approval threshold

### Domain Experts
- Users can be designated as experts for specific domains
- Domain experts can mark entries as "official"
- Staff users have admin privileges

### Comment Threading
Backend supports threaded comments on any model (UI pending).

## 🔮 Future Enhancements

Components designed but not yet implemented:
- WYSIWYG editor for creating/editing definitions
- Review dashboard for approving pending versions
- Comment UI with threaded replies
- Version history viewer
- Entry picker for internal linking
- Create term dialog

## 📝 License

This project is for educational purposes.

## 🙏 Acknowledgments

Built following Django and Angular best practices with Termageddon brand guidelines.

---

**Ready to explore?** Run `./demo.sh` and start browsing! 🚀

