# Termageddon

A production-ready full-stack glossary management system with Django REST Framework backend and Angular 17 frontend, featuring GitHub-style approval workflows and perspective-based organization.

## 🚀 Quick Start

### Option 1: Demo Script (Recommended)

Launch the complete application with one command:

```bash
./demo.sh
```

This will:

- Reset and populate the database with 360 test entries
- Start the Django backend server
- Start the Angular frontend server
- Open Chrome with both the admin interface and frontend app

**Login:** `admin` / `admin` or `mariacarter` / `ImABird`

### Option 2: Manual Setup

#### Backend Setup (2 minutes)

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

#### Frontend Setup (2 minutes)

Open a new terminal:

```bash
# Navigate to frontend directory
cd frontend

# Dependencies are already installed!
# Just start the development server:
npm start
```

✅ **Frontend is now running at:** `http://localhost:4200`

## 🎯 What You Can Do

### ✅ Currently Working

- **Authentication:** Token-based login/logout
- **Browse Glossary:** 360 pre-loaded entries across 9 perspectives
- **Search:** Real-time search by term name
- **Filter:** Perspective dropdown filter
- **Rich Text Editing:** TinyMCE WYSIWYG editor with custom link types
- **GitHub-Style Workflow:** Request reviewers, edit during approval, publish actions
- **Review Dashboard:** Approve drafts, view replaces section, publish approved drafts
- **My Drafts:** Personal draft management and review progress tracking
- **Comment System:** Threaded discussions with resolve functionality
- **Draft History:** Timeline view of all changes
- **Term Creation:** Add new terms with perspective selection
- **Internal Linking:** Link between glossary entries
- **View Definitions:** HTML-formatted definitions with approval status
- **Approver Info:** Visual display of who approved each definition
- **Admin Interface:** Full CRUD with custom actions
- **API:** Complete REST API with pagination and filtering

## 📋 Project Status

### ✅ COMPLETED - Production-Ready Full-Stack Application

#### Backend (Django REST API) - 100% COMPLETE ✅

- **Django 5.1.4** with Django REST Framework 3.16.0
- **7 Data Models** with soft delete and audit fields
- **72/72 Tests Passing** ✅ (90%+ coverage)
- **Complete REST API** with authentication, CRUD, and workflows
- **GitHub-Style Approval Workflow** with reviewer selection
- **Comment System** with threading and resolve functionality
- **Admin Interface** with custom actions and bulk operations
- **Test Data** - 360 entries loaded from CSV

#### Frontend (Angular 17) - COMPLETE ✅

- **Angular 17** with standalone components
- **TinyMCE Rich Text Editor** with custom link types
- **GitHub-Style Review Workflow** components
- **Comment System** with threaded replies
- **Draft History** and term creation dialogs
- **Tailwind CSS** with Termageddon branding
- **E2E Testing** with Playwright
- **Complete Workflow** - browse, edit, review, publish

#### Key Features Implemented

- **Soft Delete:** All models support soft delete
- **Approval Workflow:** 2 approvals required, authors can't approve own drafts
- **Perspective Curators:** Users can endorse entries as "official"
- **Comment Threading:** Backend supports threaded comments
- **Rich Text Editing:** Professional WYSIWYG with custom tools
- **Internal Linking:** Link between glossary entries
- **Version History:** Timeline view of all changes
- **Term Creation:** Add new terms with perspective selection

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│   Angular 17 Frontend               │
│   • Login & Authentication          │
│   • Term Browser with Search        │
│   • Rich Text Editor (TinyMCE)        │
│   • Review Dashboard                │
│   • Comment System                  │
│   • Version History                 │
│   • Termageddon Brand Styling       │
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
│   • Perspective Curator System     │
│   • Comprehensive Admin Interface   │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│   SQLite Database                   │
│   • 360 Glossary Entries            │
│   • 10 Test Users                   │
│   • 9 Perspectives                  │
└─────────────────────────────────────┘
```

## 🔐 Test Credentials

- **Admin:** `admin` / `admin`
- **Test Users (password = ImABird):**
  - `mariacarter` (Maria Carter) - Perspective Curator: Physics, Chemistry
  - `bencarter` (Ben Carter) - Perspective Curator: Chemistry, Biology
  - `leoschmidt` (Leo Schmidt) - Perspective Curator: Biology, Geology
  - `kenjitanaka` (Kenji Tanaka) - Perspective Curator: Physics, Geology
  - `sofiarossi` (Sofia Rossi) - Perspective Curator: Computer Science, Graph Theory
  - `aishakhan` (Aisha Khan) - Regular User
  - `samuelgreene` (Samuel Greene) - Regular User
  - `ivanpetrov` (Ivan Petrov) - Regular User
  - `chloedubois` (Chloe Dubois) - Regular User
  - `evelynreed` (Evelyn Reed) - Regular User (not a test user, but uses same password)

## 📊 Test Data

The application includes:

- **360 glossary entries** (Physics, Chemistry, Biology, Computer Science, etc.)
- **10 test users** with various permissions
- **9 perspectives** with assigned curators
- **Pre-approved definitions** (2 approvals each)

## 🧪 Testing

### Backend Tests (72/72 passing ✅)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pytest -v
```

### Frontend Tests

```bash
cd frontend
npm test
```

### E2E Tests

```bash
./run-tests.sh --e2e
```

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
- TinyMCE 6.x
- Playwright (E2E testing)

## 📚 Documentation

- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - Complete API reference
- **[USER_GUIDE.md](USER_GUIDE.md)** - Comprehensive user guide
- **[TODO.md](TODO.md)** - Future enhancements and roadmap

## 🔮 Future Enhancements

See [TODO.md](TODO.md) for detailed roadmap including:

- Advanced search and filtering
- Bulk operations
- Export functionality
- Notification system
- Analytics and reporting
- Mobile PWA version

## 📝 License

This project is for educational purposes.

## 🙏 Acknowledgments

Built following Django and Angular best practices with Termageddon brand guidelines.

---

**Ready to explore?** Run `./demo.sh` and start browsing! 🚀
