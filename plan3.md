# Termageddon Enhancement Plan

## Overview

Enhance the existing Termageddon glossary management system based on requirements in `termageddon-5.txt`. The project has a solid foundation with Django REST API backend (72/72 tests passing) and Angular frontend with core functionality.

## Current State

**Backend (Django REST API):**
- ✅ Complete CRUD operations for all models
- ✅ Authentication system with token-based auth
- ✅ Approval workflow with 2-approver requirement
- ✅ Domain expert system
- ✅ Soft delete implementation
- ✅ 72/72 tests passing
- ✅ Django admin interface

**Frontend (Angular 17):**
- ✅ Login and authentication working
- ✅ Glossary browsing with search/filter
- ✅ Term detail view with TinyMCE editor
- ✅ Review dashboard implemented
- ✅ Termageddon branding and responsive design
- ✅ Route guards and navigation

## Implementation Plan

### Phase 1: Security & Authentication Review

**Files to modify:**
- `backend/glossary/views.py` - Review all ViewSet permission_classes
- `backend/Termageddon/settings.py` - Review authentication settings
- `frontend/src/app/services/auth.service.ts` - Enhance error handling

**Tasks:**
1. Audit all API endpoints to verify `IsAuthenticated` permission classes
2. Review authentication flow in `AuthService.login()` and `AuthService.logout()`
3. Add proper error handling for authentication failures
4. Test unauthenticated access to all endpoints

**Expected changes:**
- Verify all ViewSets have proper `permission_classes = [IsAuthenticated]`
- Add proper error messages for auth failures
- Ensure token refresh/expiry handling

### Phase 2: Code Quality & Maintenance

**Files to modify:**
- All Python files in `backend/` - Apply Black formatting
- All TypeScript files in `frontend/src/` - Apply Prettier formatting
- Review for code duplication across services and components

**Tasks:**
1. Run Black formatter on all Python files: `black backend/`
2. Run Prettier on all TypeScript files: `npx prettier --write frontend/src/`
3. Identify duplicated code patterns in:
   - `frontend/src/app/services/` - Common API call patterns
   - `frontend/src/app/components/` - Similar form handling
   - `backend/glossary/` - Repeated validation logic
4. Remove comments that don't add value (focus on complex business logic only)

**Expected changes:**
- Consistently formatted codebase
- Reduced code duplication
- Cleaner, more maintainable code

### Phase 3: Editor Migration (TinyMCE → Quill)

**Files to modify:**
- `frontend/package.json` - Remove TinyMCE, add Quill
- `frontend/angular.json` - Update assets configuration
- `frontend/src/app/components/definition-form/` - Replace TinyMCE with Quill
- `frontend/src/app/components/entry-picker/` - Create new component

**Tasks:**
1. Remove TinyMCE dependencies:
   ```bash
   npm uninstall @tinymce/tinymce-angular tinymce
   ```
2. Install Quill dependencies:
   ```bash
   npm install quill ngx-quill
   ```
3. Update `angular.json` assets configuration
4. Replace TinyMCE editor in `DefinitionFormComponent`:
   - Remove `EditorModule` import
   - Add `QuillModule` import
   - Replace `<editor>` with `<quill-editor>`
   - Update editor configuration
5. Implement custom link management:
   - Add toolbar buttons for URL and internal links
   - Create `EntryPickerComponent` modal
   - Handle link insertion with proper data attributes

**Expected changes:**
- Quill editor fully functional
- Custom link buttons in toolbar
- Entry picker modal for internal linking
- Proper HTML sanitization

### Phase 4: Workflow & Approval System Completion

**Files to modify:**
- `frontend/src/app/components/review-dashboard/` - Enhance with reviewer selection
- `frontend/src/app/services/glossary.service.ts` - Add workflow methods
- `frontend/src/app/components/reviewer-selector-dialog/` - Create new component

**Tasks:**
1. Create `ReviewerSelectorDialogComponent`:
   - Display list of users from `/api/users/`
   - Checkbox selection for multiple reviewers
   - Search/filter users by name
   - Emit selected reviewer IDs
2. Enhance `ReviewDashboardComponent`:
   - Add "Request Review" button for own versions
   - Wire up reviewer selector dialog
   - Add "Publish" button for approved versions
   - Show "Replaces" section with current active version
3. Update `GlossaryService`:
   - Add `requestReview(versionId, reviewerIds)` method
   - Add `publishVersion(versionId)` method
   - Add `getUsers()` method for reviewer selection

**Expected changes:**
- Complete reviewer selection workflow
- Publish functionality for approved versions
- "Replaces" section showing version comparison
- Enhanced review dashboard UI

### Phase 5: Search & Discovery Enhancement

**Files to modify:**
- `frontend/src/app/components/term-list/` - Enhance filtering
- `frontend/src/app/services/glossary.service.ts` - Add search methods
- `backend/glossary/views.py` - Enhance filtering capabilities

**Tasks:**
1. Enhance `TermListComponent`:
   - Add more filter options (approval status, author, date range)
   - Improve search performance
   - Add search result highlighting
2. Update `GlossaryService.searchEntries()`:
   - Add advanced search parameters
   - Implement search suggestions
   - Add debouncing for search input
3. Enhance backend filtering:
   - Add more filter options to ViewSets
   - Optimize database queries
   - Add full-text search capabilities

**Expected changes:**
- Enhanced search interface
- Better filtering options
- Improved search performance
- Search result highlighting

### Phase 6: Testing Implementation

**Files to create/modify:**
- `frontend/src/app/services/*.spec.ts` - Unit tests for services
- `frontend/src/app/components/*.spec.ts` - Unit tests for components
- `frontend/e2e/` - E2E tests for workflows
- `backend/glossary/tests/` - Additional backend tests

**Tasks:**
1. Create service unit tests:
   - `AuthService` - login, logout, token management
   - `GlossaryService` - API calls, error handling
   - `PermissionService` - permission checks
   - `CommentService` - CRUD operations
2. Create component unit tests:
   - `LoginComponent` - form validation, login flow
   - `TermListComponent` - search, filtering, selection
   - `TermDetailComponent` - rendering, edit mode
   - `ReviewDashboardComponent` - approval workflow
3. Create E2E tests:
   - Complete login workflow
   - Term browsing and search
   - Edit and approval workflow
   - Reviewer selection and publish workflow
4. Ensure all existing backend tests continue to pass

**Expected changes:**
- Comprehensive test coverage (80%+ frontend, maintain 90%+ backend)
- All tests passing
- E2E test suite for critical workflows

### Phase 7: Documentation

**Files to create/modify:**
- `backend/README.md` - API documentation
- `frontend/README.md` - Frontend documentation
- `API_DOCUMENTATION.md` - Comprehensive API docs
- `USER_GUIDE.md` - User documentation

**Tasks:**
1. Update `backend/README.md`:
   - API endpoint documentation with examples
   - Authentication flow documentation
   - Setup and development instructions
2. Update `frontend/README.md`:
   - Component documentation
   - Service documentation
   - Development setup
3. Create `API_DOCUMENTATION.md`:
   - Complete API reference
   - Request/response examples
   - Error codes and handling
4. Create `USER_GUIDE.md`:
   - User workflow documentation
   - Feature explanations
   - Troubleshooting guide

**Expected changes:**
- Comprehensive API documentation
- User guide documentation
- Developer documentation
- Updated README files

### Phase 8: Additional Enhancements

**Files to create/modify:**
- `frontend/src/app/components/comment-thread/` - New component
- `frontend/src/app/components/term-dialog/` - New component
- `frontend/src/app/services/comment.service.ts` - Enhance existing
- `frontend/src/app/services/glossary.service.ts` - Add term creation

**Tasks:**
1. Implement comment system:
   - Create `CommentThreadComponent` with threading
   - Add reply functionality
   - Add resolve/unresolve actions
   - Integrate with existing `CommentService`
2. Implement term creation:
   - Create `TermDialogComponent` modal
   - Add form validation
   - Create term and entry together
   - Integrate with `GlossaryService`
3. Ensure proper integration between all components

**Expected changes:**
- Comment system with threading
- Term creation workflow
- Integrated feature set

## Implementation Order

1. **Security & Authentication Review** (Day 1)
2. **Code Quality & Maintenance** (Day 1-2)
3. **Editor Migration** (Day 3-4)
4. **Workflow Completion** (Day 5-6)
5. **Search Enhancement** (Day 7)
6. **Testing Implementation** (Day 8-10)
7. **Documentation** (Day 11)
8. **Additional Enhancements** (Day 12-14)

## Success Criteria

- All existing tests continue to pass
- Quill editor fully functional with custom features
- Complete GitHub-style approval workflow
- Frontend test coverage reaches 80%+
- Code formatted consistently with Black/Prettier
- Comprehensive documentation provided
- All features integrated and working

## Risk Mitigation

- **Editor Migration**: Test thoroughly with existing content
- **Test Coverage**: Implement tests parallel to feature development
- **Integration**: Test each phase before moving to next
- **Performance**: Monitor bundle size and loading times

## Deliverables

- Enhanced Django backend with security improvements
- Angular frontend with Quill editor and complete workflow
- Comprehensive test suite (unit, integration, E2E)
- Formatted and clean codebase
- Complete documentation suite
