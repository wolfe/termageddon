<!-- 39054eb2-1989-4755-8265-d0a7ea2a97bf 320a15e4-5728-43cf-9a50-7c6149294fb8 -->
## Termageddon Full-Stack Application

Build a production-ready glossary management system with Django REST backend and Angular frontend, including comprehensive testing throughout development.

**Execution Notes**:

- Fresh build in root directory (not editing v1)
- Execute sequentially without prompting for approvals
- Fresh SQLite database (no migration concerns)
- Stop execution if tests fail

## Tech Stack

- **Backend**: Django 5.1.4 + Django REST Framework
- **Database**: SQLite (fresh database)
- **Frontend**: Angular 17
- **Testing**: pytest + pytest-django (backend), Jest (frontend)
- **Styling**: Termageddon colors, Tailwind CSS, dense UI (Slack-like density)

## Part 1: Django Backend Setup & Configuration

### Initial Project Structure

Create in root directory:

```
backend/
  manage.py
  Termageddon/
    __init__.py
    settings.py
    urls.py
    wsgi.py
    asgi.py
  glossary/
    __init__.py
    models.py
    admin.py
    views.py
    serializers.py
    urls.py
    tests/
      __init__.py
      test_models.py
      test_views.py
      test_serializers.py
    management/
      commands/
        load_test_data.py
  requirements.txt
  pytest.ini
  .env (gitignored)
  db.sqlite3 (gitignored)
```

### Requirements (`requirements.txt`)

```
Django==5.1.4
djangorestframework==3.16.0
django-cors-headers==4.7.0
django-filter==25.1
pytest==8.3.4
pytest-django==4.9.0
factory-boy==3.3.1
faker==37.8.0
```

### Django Settings Configuration (`Termageddon/settings.py`)

**Key configurations**:

- **Database**: SQLite (default Django setup, fresh database)
- **Authentication**: Django's built-in `User` model with Token authentication
- **INSTALLED_APPS**: Add:
  - `django.contrib.contenttypes` (required for GenericForeignKey)
  - `rest_framework`
  - `rest_framework.authtoken`
  - `corsheaders`
  - `django_filters`
  - `glossary`
- **MIDDLEWARE**: Add `corsheaders.middleware.CorsMiddleware` (must be at top, before CommonMiddleware)
- **CORS Settings**:
  ```python
  CORS_ALLOWED_ORIGINS = ['http://localhost:4200']
  CORS_ALLOW_CREDENTIALS = True
  ```

- **REST Framework Settings**:
  ```python
  REST_FRAMEWORK = {
      'DEFAULT_AUTHENTICATION_CLASSES': [
          'rest_framework.authentication.TokenAuthentication',
      ],
      'DEFAULT_PERMISSION_CLASSES': [
          'rest_framework.permissions.IsAuthenticated',
      ],
      'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
      'PAGE_SIZE': 50
  }
  ```

- **Static Files**: Configure `STATIC_URL` and `STATIC_ROOT` for admin
- **SECRET_KEY**: Generate and store in `.env` file
- **MIN_APPROVALS**: Set to 2 (for EntryVersion approval workflow)

### Models (`glossary/models.py`)

**Design Notes**:

- Terms are globally unique (not domain-specific)
- An Entry represents a (term, domain) pair
- Soft delete with `is_deleted` flag
- All models except AuditedModel should have `db_table` specified to avoid conflicts

1. **AuditedModel** (abstract base):

   - `created_at` (DateTimeField, auto_now_add)
   - `updated_at` (DateTimeField, auto_now)
   - `created_by` (ForeignKey to User, null=True, `SET_NULL` on delete)
   - `updated_by` (ForeignKey to User, null=True, `SET_NULL` on delete)
   - `is_deleted` (BooleanField, default=False)
   - `delete()` override for soft delete
   - Custom manager `objects` (excludes is_deleted=True)
   - Custom manager `all_objects` (includes deleted)

2. **Domain** (extends AuditedModel):

   - `name` (CharField, max_length=100, unique)
   - `description` (TextField, blank=True)
   - **Note**: For soft-delete compatibility with unique constraint, use custom clean() to check uniqueness only among non-deleted records

3. **Term** (extends AuditedModel):

   - `text` (CharField, max_length=255, unique) - globally unique
   - `text_normalized` (CharField, editable=False, indexed) - lowercase, unidecode applied
   - `is_official` (BooleanField, default=False) - indicates term has official status (can be set by glossary admins)
   - `save()` override to auto-populate text_normalized using unidecode
   - **Note**: For soft-delete compatibility, use custom validation

4. **Entry** (extends AuditedModel):

   - `term` (ForeignKey to Term, `CASCADE` on delete)
   - `domain` (ForeignKey to Domain, `CASCADE` on delete)
   - `active_version` (ForeignKey to EntryVersion, null=True, blank=True, `SET_NULL` on delete, related_name='active_for_entry')
   - `is_official` (BooleanField, default=False) - indicates this entry is the official definition for this term in this domain
   - **Constraint**: Custom validation in `clean()` to enforce term+domain uniqueness among non-deleted entries only
   - **Migration note**: Create Entry model first without active_version, then add field in second migration after EntryVersion exists

5. **EntryVersion** (extends AuditedModel):

   - `entry` (ForeignKey to Entry, related_name='versions', `CASCADE` on delete)
   - `content` (TextField) - rich HTML content (sanitized on save)
   - `author` (ForeignKey to User, `PROTECT` on delete)
   - `timestamp` (DateTimeField, auto_now_add)
   - `approvers` (ManyToManyField to User, related_name='approved_versions', blank=True)
   - Property: `is_approved` - returns `self.approvers.count() >= settings.MIN_APPROVALS`
   - Property: `approval_count` - returns `self.approvers.count()`
   - Validation in `clean()`: max 1 unapproved version per author per entry (check before save)
   - Method: `approve(user)` - adds user to approvers if not author, not already approved, validates

6. **Comment** (extends AuditedModel):

   - `content_type` (ForeignKey to ContentType) - for GenericForeignKey
   - `object_id` (PositiveIntegerField)
   - `content_object` (GenericForeignKey)
   - `parent` (ForeignKey to self, null=True, blank=True, `CASCADE` on delete, related_name='replies')
   - `text` (TextField)
   - `author` (ForeignKey to User, `PROTECT` on delete)
   - `is_resolved` (BooleanField, default=False)
   - **Note**: Only top-level comments (parent=None) can be resolved

7. **DomainExpert** (extends AuditedModel):

   - `user` (ForeignKey to User, `CASCADE` on delete)
   - `domain` (ForeignKey to Domain, `CASCADE` on delete)
   - `assigned_by` (ForeignKey to User, related_name='assigned_experts', `SET_NULL` on delete, null=True)
   - **Constraint**: Custom validation to enforce user+domain uniqueness among non-deleted entries

**Permissions**:

- **Glossary Admin**: User with `is_staff=True` (Django's built-in staff status)
- **Domain Expert**: User who has a DomainExpert record for the domain
- Helper method on User (via monkey-patch or middleware): `is_domain_expert_for(domain_id)`

**Signal**: Post-save on EntryVersion - when `is_approved` becomes True (approval_count >= MIN_APPROVALS), check if entry.active_version is None or older than this version, and if so, set this as entry.active_version using `update()` to avoid triggering save signal loops.

### API Endpoints (`glossary/views.py`, `glossary/serializers.py`)

**Serializers**:

- Use nested serializers for read operations (show full related objects)
- Use ID-based serializers for write operations (accept IDs)
- Include computed fields: `is_approved`, `approval_count` on EntryVersion
- UserSerializer with fields: id, username, first_name, last_name, is_staff

**ViewSets with ModelViewSet (full CRUD)**:

1. **DomainViewSet** (`/api/domains/`)

   - list, create, retrieve, update, partial_update
   - Permissions: Authenticated users can view, staff can create/edit

2. **TermViewSet** (`/api/terms/`)

   - list, create, retrieve, update, partial_update
   - Filter: text (icontains), is_official
   - Permissions: Authenticated users can view/create, staff can edit is_official flag

3. **EntryViewSet** (`/api/entries/`)

   - list, create, retrieve, update, partial_update
   - Filters: `domain` (exact), `term__text` (icontains), `is_official` (bool)
   - Includes nested `active_version` data in responses
   - Custom action: `mark_official` (POST) - requires domain expert or staff permission
   - Permissions: Authenticated users can view/create, domain experts/staff can mark official

4. **EntryVersionViewSet** (`/api/entry-versions/`)

   - list, create, retrieve (no update/delete)
   - Filters: `entry` (exact), `author` (exact)
   - Custom action: `approve` (POST) - calls version.approve(request.user), handles validation errors
   - Response includes: is_approved, approval_count, approvers list
   - Permissions: Authenticated users can create, any authenticated user can approve (except author)

5. **CommentViewSet** (`/api/comments/`)

   - list, create, retrieve, update, partial_update
   - Filters: `content_type`, `object_id`, `is_resolved`, `parent__isnull` (for top-level only)
   - Actions: `resolve` (POST), `unresolve` (POST) - only for top-level comments
   - Permissions: Authenticated users can CRUD their own comments, staff can resolve any

6. **DomainExpertViewSet** (`/api/domain-experts/`)

   - list, create, destroy
   - Permissions: Staff only

**Auth Endpoints**:

- `POST /api/auth/login/` - DRF's ObtainAuthToken view (username/password → token)
- `POST /api/auth/logout/` - Delete user's token
- `GET /api/auth/me/` - Current user info + computed fields:
  - `is_staff` (glossary admin check)
  - `domain_expert_for` (list of domain IDs)
  - `username`, `first_name`, `last_name`

### Admin Interface (`glossary/admin.py`)

- Register all models with ModelAdmin
- Display list_display, list_filter, search_fields
- Custom actions: bulk approve EntryVersions, mark Entry as official, soft delete, undelete
- Inline editing for EntryVersion under Entry
- Show is_deleted status in list views

### Backend Testing Strategy

**Test files** (`glossary/tests/`):

- `conftest.py` - pytest fixtures (users, domains, terms, entries) using factory_boy
- `test_models.py` - Model methods, properties, validation, soft delete, signals
- `test_views.py` - API endpoints, filtering, permissions, custom actions, approval workflow
- `test_serializers.py` - Serialization, validation, nested fields

**Factories** (using factory_boy):

- UserFactory, DomainFactory, TermFactory, EntryFactory, EntryVersionFactory, CommentFactory, DomainExpertFactory

**Coverage target**: 90%+ for models, views, serializers

**Test execution**: Run `pytest` after each major component (models, views, etc.)

### Initial Data Setup

**Management command** (`glossary/management/commands/load_test_data.py`):

1. Create superuser: `admin` / `admin`
2. Parse `test_data/test_data.csv` to extract unique authors
3. Create User accounts with username = normalized name (e.g., "maria.flores") and password = username
4. Create Domains from unique domain values in CSV
5. Randomly assign 2-3 users as DomainExperts to random domains
6. For each CSV row:

   - Get or create Term
   - Get or create Entry (term + domain)
   - Create EntryVersion with content = definition, author from CSV
   - Add 2 random users (not the author) as approvers to auto-approve
   - Signal will automatically set as active_version

## Part 2: Angular Frontend

### Initial Project Setup

Create in root directory:

```
frontend/
  src/
    app/
      components/
      services/
      models/
      guards/
      app.component.ts
      app.config.ts
      app.routes.ts
    assets/
    images/ (Termageddon logo, favicon)
    styles.scss
    index.html
  angular.json
  package.json
  tailwind.config.js
  tsconfig.json
```

**Dependencies** (`package.json`):

- Angular 17 core packages
- Quill.js for WYSIWYG editor (`ngx-quill`)
- Tailwind CSS for styling
- Jest for testing (replace Karma)

### Core Services

1. **AuthService** (`services/auth.service.ts`)

   - `login(username, password): Observable<{token: string, user: User}>`
   - `logout(): Observable<void>` - delete token from backend
   - `getCurrentUser(): Observable<User>` - calls `/api/auth/me/`
   - `getToken(): string | null` - from localStorage
   - `setToken(token: string): void` - to localStorage
   - `clearToken(): void` - remove from localStorage
   - `isAuthenticated(): boolean` - check if token exists
   - **AuthInterceptor**: Inject `Authorization: Token <token>` header into all HTTP requests
   - **Tests**: Login success/failure, token storage, logout, interceptor header injection

2. **GlossaryService** (`services/glossary.service.ts`)

   - CRUD methods for domains, terms, entries, entry-versions
   - `searchEntries(filters): Observable<PaginatedResponse<Entry>>`
   - `markOfficial(entryId): Observable<Entry>`
   - `approveVersion(versionId): Observable<EntryVersion>`
   - **Tests**: API calls with mocked HttpClient

3. **CommentService** (`services/comment.service.ts`)

   - `getComments(contentType, objectId): Observable<Comment[]>`
   - `addComment(comment: CreateCommentDto): Observable<Comment>`
   - `resolveComment(id): Observable<Comment>`
   - Helper: `buildCommentTree(comments: Comment[]): Comment[]` - nest replies under parent
   - **Tests**: CRUD, threading logic

4. **PermissionService** (`services/permission.service.ts`)

   - `currentUser$: BehaviorSubject<User | null>` - cached user
   - `isAdmin(): boolean` - check user.is_staff
   - `isDomainExpert(domainId?: number): boolean` - check user.domain_expert_for includes domainId
   - `refreshUser(): Observable<User>` - fetch from `/api/auth/me/`
   - **Tests**: Permission checks

### TypeScript Models (`models/`)

Define interfaces matching backend serializers:

- `User`, `Domain`, `Term`, `Entry`, `EntryVersion`, `Comment`, `DomainExpert`
- `PaginatedResponse<T>` for API list responses

### Components

1. **LoginComponent** (`components/login/`)

   - Reactive form (username, password)
   - Submit → AuthService.login() → store token → PermissionService.refreshUser() → navigate to /glossary
   - Error handling with user-friendly messages
   - **Tests**: Form validation, login flow, error display

2. **MainLayoutComponent** (`components/main-layout/`)

   - Top nav bar with Termageddon colors (#E31937 header, white text)
   - Logo (left), user menu (right: username + logout button)
   - Router outlet for child routes
   - **Tests**: Navigation, logout action

3. **TermListComponent** (`components/term-list/`)

   - Left sidebar panel (dense list, ~30% width)
   - Search input (filters by term text, domain dropdown)
   - Toggle filter: show/hide unapproved entries
   - List displays: term text, domain badge, approval status icon
   - Click entry → `@Output() entrySelected` event
   - Pagination controls
   - **Tests**: Search, filtering, selection events, pagination

4. **TermDetailComponent** (`components/term-detail/`)

   - Right main panel (~70% width)
   - Display entry.active_version.content (sanitized HTML via DomSanitizer)
   - Show approval status badge, approver avatars (first_name initials)
   - Edit button (if user is authenticated) → emits event to parent to show DefinitionFormComponent
   - Version history button → toggles VersionHistoryComponent
   - Comments section → embeds CommentThreadComponent
   - **Internal link handling**: Detect `data-entry-id` attribute, make clickable, navigate to entry on click
   - **Tests**: Rendering, HTML sanitization, edit toggle, internal link navigation

5. **DefinitionFormComponent** (`components/definition-form/`)

   - Quill.js WYSIWYG editor with custom toolbar
   - **Custom Quill modules**:
     - External URL link button (globe icon) - standard Quill link
     - Internal entry reference button (book icon) → opens EntryPickerComponent modal
   - Entry picker: search/select entry → insert as `<a data-entry-id="{{id}}" href="/glossary?entry={{id}}">{{term.text}}</a>`
   - Save → call GlossaryService.createEntryVersion() → emit success event → parent switches to view mode
   - Cancel → discard, emit cancel event → parent returns to view mode
   - **Tests**: Editor initialization, link insertion (both types), save/cancel

6. **EntryPickerComponent** (`components/entry-picker/`)

   - Modal dialog for selecting an entry to link to
   - Search input (term text, domain filter)
   - List of matching entries
   - Select button → returns selected entry to caller
   - **Tests**: Search, selection

7. **VersionHistoryComponent** (`components/version-history/`)

   - Collapsible timeline (custom accordion or Material expansion panel)
   - List all versions for entry (author name, timestamp, approval count badge)
   - Click version → emit event → parent shows in preview mode
   - **Tests**: Rendering, selection

8. **CommentThreadComponent** (`components/comment-thread/`)

   - Recursive component for nested comments
   - Display: comment text, author name, timestamp (relative: "2 hours ago")
   - Reply button → show reply form (nested indent)
   - Resolve button (top-level comments only, if user is staff or comment author)
   - **Tests**: Nesting, reply, resolve

9. **ReviewDashboardComponent** (`components/review-dashboard/`)

   - List pending EntryVersions (approval_count < MIN_APPROVALS)
   - Card layout: term text (bold), domain badge, author, content preview (truncated), approval count
   - Approve button → call GlossaryService.approveVersion() → remove from list on success
   - Filter by domain dropdown
   - Disable approve button if current user is version author
   - **Tests**: List rendering, approve action, filtering, author check

10. **TermDialogComponent** (`components/term-dialog/`)

    - Material dialog or custom modal
    - Form: term text input, domain dropdown, initial definition textarea
    - Create → POST Term, POST Entry, POST EntryVersion (chain requests)
    - **Tests**: Form validation, creation flow

### Routing & Guards

**Routes** (`app.routes.ts`):

```typescript
/login → LoginComponent (no guard)
/ → MainLayoutComponent (AuthGuard)
  /glossary → GlossaryViewComponent (TermList + TermDetail side-by-side)
  /review → ReviewDashboardComponent
```

**AuthGuard**: Check `AuthService.isAuthenticated()`, redirect to /login if false

### Styling

**Termageddon Brand Colors** (`styles.scss` + `tailwind.config.js`):

- Primary: #E31937 (red)
- Secondary: #003A70 (blue)
- Neutrals: #F5F5F5 (light gray bg), #333 (dark text)

**Design**:

- Typography: 14px base font, line-height 1.4
- Spacing: Compact padding (4px, 8px, 12px scale using Tailwind)
- Layout: Flexbox for term list + detail (30% / 70% split)
- Density: Slack-like (minimal whitespace, tight line height, compact cards)

**Tailwind config**: Define Termageddon colors as custom theme extending default palette

### Frontend Testing

**Unit tests** (`.spec.ts` files with Jest):

- All components: rendering, inputs/outputs, user interactions
- All services: API calls with mocked HttpClient
- Guards: auth check logic
- Use Angular Testing Library for component tests

**Coverage target**: 80%+ for components and services

**Test execution**: Run `npm test` after completing each component/service

## Part 3: Integration & Polish

### Cross-Stack Integration

1. Start Django dev server: `python manage.py runserver` (port 8000)
2. Start Angular dev server: `ng serve` (port 4200)
3. Verify CORS working (Angular can call Django API)
4. Manual testing: login, browse, edit, approve workflow

### End-to-End Testing

**Manual test scenarios**:

1. Login as test user → see glossary
2. Search for term → view definition with active_version
3. Edit definition → save → creates new EntryVersion (unapproved)
4. Login as different user → go to Review Dashboard → approve version → becomes active
5. Add comment to entry → reply to comment → resolve thread
6. Create internal link in definition → verify navigation works

### Error Handling & Edge Cases

- API errors: display user-friendly messages in toasts/alerts
- Empty states: "No entries found" placeholders with helpful text
- Loading states: spinners during API calls (loading$ observables)
- Form validation: required fields, max lengths, inline error messages
- Network errors: Retry button, offline indicator

### Documentation

**README files**:

- `backend/README.md`: Setup instructions (venv, pip install, migrate, createsuperuser, load_test_data), run tests, API overview
- `frontend/README.md`: Setup (npm install), development server, testing, build for production

## Implementation Order & Checkpoints

1. **Django Setup** → Create project, configure settings, install apps
2. **Models + Migrations** → Implement all models in stages (handle Entry/EntryVersion circular ref), write migrations, test
3. **Model Tests** → Write comprehensive tests, verify pass
4. **Admin** → Register models, test in admin interface
5. **Serializers + Views** → Implement all ViewSets and serializers
6. **API Tests** → Write comprehensive tests, verify pass
7. **Load Test Data** → Management command, verify data loads correctly
8. **Angular Setup** → Create project, configure Tailwind, Termageddon colors
9. **Models & Services** → TypeScript interfaces, implement all services
10. **Service Tests** → Write tests with mocked HTTP, verify pass
11. **Core Components** → Login, MainLayout, TermList, TermDetail
12. **Editor Components** → DefinitionForm, EntryPicker with Quill.js custom modules
13. **Supporting Components** → VersionHistory, CommentThread, ReviewDashboard, TermDialog
14. **Component Tests** → Write tests for all components, verify pass
15. **Integration** → Connect frontend to backend, manual testing
16. **Polish** → Error handling, loading states, styling refinements

**Stopping rule**: If any test suite fails, stop and fix before proceeding

## Deliverables

- Fully functional Django REST API with 90%+ test coverage
- Angular frontend with Termageddon branding and 80%+ test coverage
- SQLite database with test data loaded from CSV
- Test users with credentials for manual testing
- All tests passing (backend + frontend)
- README documentation for setup and usage

### To-dos

- [ ] Create Django project structure, requirements.txt, configure settings (CORS, DRF, auth, contenttypes)
- [ ] Create .env file, generate SECRET_KEY, configure .gitignore
- [ ] Implement AuditedModel, Domain, Term models with soft delete and custom managers
- [ ] Implement Entry model (without active_version field initially)
- [ ] Implement EntryVersion, Comment, DomainExpert models
- [ ] Add active_version field to Entry, create signal for auto-activation
- [ ] Create and apply migrations in correct order for circular reference
- [ ] Write comprehensive model tests (factories, properties, soft delete, validation, signals)
- [ ] Configure Django admin for all models with custom actions and inlines
- [ ] Create DRF serializers for all models with nested/flat variants
- [ ] Implement API ViewSets with filtering, custom actions, permissions
- [ ] Implement auth endpoints (login, logout, me) and permission helpers
- [ ] Write API endpoint tests (CRUD, filtering, permissions, approval workflow)
- [ ] Create load_test_data management command, create superuser and test users, load CSV
- [ ] Create Angular project, configure Tailwind with Termageddon colors, set up routing and guards
- [ ] Define TypeScript interfaces for all models
- [ ] Implement all Angular services (Auth, Glossary, Comment, Permission) with interceptor
- [ ] Write service tests with mocked HTTP
- [ ] Build Login, MainLayout, TermList, TermDetail components
- [ ] Build DefinitionForm with Quill.js and custom entry reference link module, EntryPicker
- [ ] Build VersionHistory, CommentThread, ReviewDashboard, TermDialog
- [ ] Write component tests for all components
- [ ] Apply Termageddon colors, dense UI styling, responsive layout
- [ ] Manual cross-stack testing, error handling, edge cases
- [ ] Write README files for backend and frontend setup