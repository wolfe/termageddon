<!-- 659c71e2-2e4c-42f1-a41d-2237bafac2a2 da0a3c30-50a6-4585-bff6-30d2022db397 -->
# Complete Termageddon Project

## Overview

The project has a solid foundation with a fully functional backend (57/57 tests passing) and core frontend features. Based on the requirements in `termageddon-4.txt`, we need to implement GitHub-style approval workflow improvements and complete missing UI components.

## Current State

**Backend (100% Complete):**

- Django REST API with full CRUD operations
- Approval workflow with 2-approver requirement
- Domain expert system
- Soft delete on all models
- 57/57 tests passing

**Frontend (Partially Complete):**

- Login and authentication working
- Glossary browsing with search/filter
- Term detail view with basic editing (textarea only)
- Review dashboard implemented
- Routes configured

## Requirements from termageddon-4.txt

The key improvements needed:

1. **"Replaces" section**: Show currently active entry when reviewing a version that would replace it
2. **Request approvals**: Select specific users to review your version
3. **Continue editing during approval**: Allow editing without creating new versions, but clear approvals if changed
4. **Filtered review view**: By default show only versions you're requested to review, authored, or related to your terms
5. **"Show all" checkbox**: Option to see all pending reviews
6. **Separate publish action**: Anyone can publish once approvals are obtained

## Implementation Status

### Backend Changes (Mostly Complete)

**Already Implemented:**

- `requested_reviewers` M2M field on `EntryVersion` (lines 177-180 in models.py)
- `is_published` boolean field (lines 181-183)
- `request_review()` method (lines 227-235)
- `publish()` method (lines 241-255)
- Auto-clear approvals on content change (lines 258-268)
- Review filtering in `EntryVersionViewSet.get_queryset()` with `show_all` parameter (lines 189-221)
- `replaces_version` field in `EntryVersionReviewSerializer` (lines 166, 187-191)
- `/api/entry-versions/{id}/request_review/` endpoint (lines 250-262 in views.py)
- `/api/entry-versions/{id}/publish/` endpoint (lines 264-274)
- `/api/users/` endpoint for reviewer selection (lines 409-417)

**Needs Verification:**

- Update validation to allow editing existing unpublished versions (currently line 210 prevents multiple unpublished versions)

### Frontend Changes (Partially Complete)

**Already Implemented:**

- Review dashboard component exists with basic functionality
- `ReviewService` with `requestReview()` and `publishVersion()` methods
- `show_all` parameter support in API calls
- Basic approval workflow UI
- `replaces_version` in `ReviewVersion` interface

**Needs Implementation:**

1. **Reviewer selection modal/dialog** - UI to select users when requesting reviews
2. **Update term-detail component** - Allow editing existing unpublished versions instead of always creating new ones
3. **Enhanced review dashboard** - Show "Replaces" section with currently active version
4. **Publish button** - Add publish action to review dashboard for approved versions
5. **Better edit workflow** - Check for existing unpublished version before creating new one

### Testing Updates Needed

**Backend:**

- Test editing unpublished versions without creating duplicates
- Test approval clearing on content change
- Test publish workflow
- Test reviewer request workflow

**Frontend:**

- E2E tests for reviewer selection
- E2E tests for publish workflow
- E2E tests for editing during approval
- Unit tests for review service

## Detailed Implementation Plan

### Phase 1: Backend Fixes and Validation

**File: `backend/glossary/models.py`**

Update `EntryVersion.clean()` to allow editing existing unpublished versions:

- Currently prevents multiple unpublished versions per author per entry
- Should allow updating the same unpublished version
- Only prevent creating a *new* unpublished version if one exists

**File: `backend/glossary/views.py`**

Add support for PATCH/PUT on unpublished versions:

- Currently `http_method_names` excludes update (line 165)
- Add conditional update: allow PATCH only for unpublished versions by the author
- Implement `update()` and `partial_update()` methods with validation

**File: `backend/glossary/tests/test_views.py`**

Add test cases:

- Test editing unpublished version content
- Test that editing clears approvals
- Test publish workflow
- Test request_review workflow
- Test that published versions cannot be edited

### Phase 2: Frontend - Reviewer Selection Modal

**New Component: `frontend/src/app/components/reviewer-selector-dialog/`**

Create a modal dialog component:

- Display list of all users (from `/api/users/`)
- Checkbox selection for multiple reviewers
- Filter/search users by name
- Confirm/Cancel actions
- Emit selected reviewer IDs

**Update: `frontend/src/app/components/review-dashboard/`**

Wire up reviewer selection:

- Replace `alert()` in `requestReview()` method (line 236)
- Open reviewer selector dialog
- Call `reviewService.requestReview()` with selected IDs
- Update UI to show requested reviewers

### Phase 3: Frontend - Edit Workflow Enhancement

**Update: `frontend/src/app/components/term-detail/`**

Before creating a new version, check for existing unpublished version:

- Call API to get versions for current entry: `/api/entry-versions/?entry={id}&author={userId}&is_published=false`
- If unpublished version exists by current user, use PATCH to update it
- If none exists, create new version with POST
- Show warning if editing will clear approvals

**Update: `frontend/src/app/services/glossary.service.ts`**

Add methods:

- `updateEntryVersion(id: number, data: Partial<EntryVersion>): Observable<EntryVersion>`
- `getUnpublishedVersionForEntry(entryId: number, authorId: number): Observable<EntryVersion | null>`

### Phase 4: Frontend - Enhanced Review Dashboard

**Update: `frontend/src/app/components/review-dashboard/review-dashboard.component.html`**

Add "Replaces" section in version detail view:

- Check if `selectedVersion.replaces_version` exists
- Display side-by-side comparison or collapsible section
- Show old content vs new content

Add "Publish" button:

- Show when `selectedVersion.is_approved && !selectedVersion.is_published`
- Call `publishVersion()` method
- Update UI after successful publish

Add "Request Review" button:

- Show for own versions that aren't published
- Open reviewer selector dialog
- Display currently requested reviewers

**Update: `frontend/src/app/components/review-dashboard/review-dashboard.component.ts`**

Enhance `publishVersion()` method:

- Remove from pending list after publish
- Show success message
- Refresh data

### Phase 5: WYSIWYG Editor (TinyMCE)

**Install TinyMCE:**

```bash
cd frontend
npm install @tinymce/tinymce-angular
```

**New Component: `frontend/src/app/components/definition-form/`**

Create rich text editor component:

- Integrate TinyMCE editor with `@tinymce/tinymce-angular`
- Configure basic toolbar: bold, italic, underline, lists, standard links
- Add custom "Link to Entry" button that opens entry-picker modal
- Store entry links with data attributes: `<a href="#" data-entry-id="123">Term Name</a>`
- Emit content changes as HTML
- Use free community edition (no API key needed for self-hosted)

**Update: `frontend/src/app/components/term-detail/`**

Replace textarea with TinyMCE editor:

- Use `<app-definition-form>` instead of `<textarea>`
- Handle rich HTML content
- Preserve formatting
- Parse entry links on display to make them clickable navigation

### Phase 6: Additional UI Components

**Component: `frontend/src/app/components/version-history/`**

Display version timeline:

- List all versions for an entry
- Show timestamps, authors, approval status
- Highlight active version
- Allow viewing historical content

**Component: `frontend/src/app/components/comment-thread/`**

Implement comment system:

- Display threaded comments
- Reply functionality
- Resolve/unresolve actions
- Attach to entries or terms

**Component: `frontend/src/app/components/entry-picker/`**

Modal for selecting entries:

- Search and filter entries
- Used when creating internal links in TinyMCE editor
- Return selected entry ID

**Component: `frontend/src/app/components/term-dialog/`**

Modal for creating new terms:

- Form with term text and domain selection
- Validation
- Create term and entry together

### Phase 7: Testing

**Backend Tests:**

- Add tests for version editing workflow
- Add tests for approval clearing
- Add tests for publish action
- Ensure all tests pass with Black formatting

**Frontend E2E Tests:**

- Test complete approval workflow with reviewer selection
- Test editing during approval process
- Test publish action
- Test "show all" vs filtered view
- Test TinyMCE editor functionality
- Ensure existing tests pass

**Frontend Unit Tests:**

- Test review service methods
- Test reviewer selector component
- Test definition form component
- Test permission service logic

### Phase 8: Documentation and Cleanup

**Update Documentation:**

- Update `STATUS.md` with completed features
- Update `README.md` with new workflows
- Add screenshots of new features
- Document TinyMCE editor link types

**Code Cleanup:**

- Remove any console.log statements
- Format all code with Black (backend) and Prettier (frontend)
- Remove empty component directories
- Update comments and docstrings

## Key Files to Modify

### Backend

- `backend/glossary/models.py` - Fix validation for editing unpublished versions
- `backend/glossary/views.py` - Add update methods for EntryVersion
- `backend/glossary/serializers.py` - Add update serializer if needed
- `backend/glossary/tests/test_models.py` - Add tests
- `backend/glossary/tests/test_views.py` - Add tests

### Frontend

- `frontend/src/app/components/term-detail/` - Enhanced edit workflow
- `frontend/src/app/components/review-dashboard/` - Add publish, reviewer selection
- `frontend/src/app/services/glossary.service.ts` - Add update methods
- `frontend/src/app/components/reviewer-selector-dialog/` - New component
- `frontend/src/app/components/definition-form/` - New TinyMCE editor component
- `frontend/src/app/components/version-history/` - New component
- `frontend/src/app/components/comment-thread/` - New component
- `frontend/src/app/components/entry-picker/` - New component
- `frontend/src/app/components/term-dialog/` - New component

## Success Criteria

1. Users can request specific reviewers for their versions
2. Users can edit their unpublished versions without creating duplicates
3. Approvals are cleared when content is edited
4. Review dashboard shows filtered view by default with "show all" option
5. Review dashboard shows "Replaces" section for versions that would replace active ones
6. Anyone can publish approved versions
7. TinyMCE editor with custom link types works
8. All backend tests pass (target: 70+ tests)
9. All frontend E2E tests pass
10. Code is formatted and documented

## Priority Order

**Must Have (P0):**

1. Fix backend validation for editing unpublished versions
2. Add backend update endpoints for unpublished versions
3. Frontend edit workflow to update existing unpublished versions
4. Reviewer selection UI
5. Publish button in review dashboard
6. "Replaces" section in review dashboard

**Should Have (P1):**

7. TinyMCE.js editor integration
8. Version history component
9. Comprehensive testing
10. Documentation updates

**Nice to Have (P2):**

11. Comment thread UI
12. Entry picker for internal links
13. Term creation dialog
14. Advanced TinyMCE toolbar features

### To-dos

- [ ] Fix EntryVersion.clean() validation to allow editing existing unpublished versions
- [ ] Add PATCH/PUT support for unpublished EntryVersions with proper authorization
- [ ] Add backend tests for edit workflow, approval clearing, and publish action
- [ ] Create reviewer selector dialog component with user list and checkbox selection
- [ ] Update term-detail component to check for and update existing unpublished versions
- [ ] Add publish button, replaces section, and wire up reviewer selection in review dashboard
- [ ] Install TinyMCE and create definition-form component with rich text editing
- [ ] Add custom link types (URL and entry reference) to TinyMCE editor toolbar
- [ ] Create version history component to display timeline of all versions for an entry
- [ ] Create comment thread component with nested replies and resolve functionality
- [ ] Create entry picker modal for selecting entries when creating internal links
- [ ] Create term creation dialog for adding new terms with domain selection
- [ ] Add E2E tests for reviewer selection, publish workflow, and edit during approval
- [ ] Update STATUS.md, README.md with completed features and new workflows