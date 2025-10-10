<!-- 1fb970c0-8da5-40dd-983f-f56aca6c96df 8e281609-3fca-4c1c-a767-2c4334b506cc -->
# Terminology and Review Updates Plan

## 1. Terminology Changes

Replace terminology throughout the entire codebase:

- "domain" → "perspective" (in UI context)
- "expert" → "curator" 
- "version" (in entry version context) → "draft"

### Backend Changes

- **Models** (`backend/glossary/models.py`): Rename `Domain` → `Perspective`, `DomainExpert` → `PerspectiveCurator`, `EntryVersion` → `EntryDraft`
- **Serializers** (`backend/glossary/serializers.py`): Update all serializer classes
- **Views** (`backend/glossary/views.py`): Update viewset names and logic
- **URLs** (`backend/glossary/urls.py`): Update API endpoint paths
- **Admin** (`backend/glossary/admin.py`): Update admin registrations
- **Tests** (`backend/glossary/tests/`): Update all test files
- **Migrations**: Create new migration to rename database tables and fields

### Frontend Changes

- **Models** (`frontend/src/app/models/index.ts`): Rename interfaces
- **Services**: Update all service files to use new terminology
- **Components**: Update all component TypeScript and HTML files
- **E2E Tests**: Update page objects and test files

## 2. Fix Review View Filtering Bug

**Issue**: The "Show all versions" checkbox shows the same list whether checked or unchecked.

**Current behavior** (lines 269-277 in `review-dashboard.component.ts`):

- `onShowAllChange()` reloads pending versions but doesn't pass the `showAll` flag to the backend

**Fix**:

- Update `ReviewService.getVersionsCanApprove()` to accept a `showAll` parameter
- When unchecked: show only drafts where the user is a requested reviewer
- When checked: show all unpublished drafts

**Files to modify**:

- `frontend/src/app/services/review.service.ts`
- `frontend/src/app/components/review-dashboard/review-dashboard.component.ts`
- `backend/glossary/views.py` (add filtering logic to the endpoint)

## 3. Add "My Drafts" Tab

Create a new view to show the current user's own drafts so they can monitor review progress.

**Implementation**:

- Create new component: `frontend/src/app/components/my-drafts/my-drafts.component.ts`
- Add route in `frontend/src/app/app.routes.ts`
- Update navigation in `frontend/src/app/components/main-layout/main-layout.component.html`
- Create backend endpoint to fetch user's own drafts with review status
- Display: draft term, perspective, approval count, requested reviewers, approvers

## 4. Enable Anyone to Change Requested Reviewers

**Current behavior**: Only the author can request reviews (line 248-251 in `models.py`)

**Change**:

- Remove the author-only restriction in `EntryDraft.request_review()` method
- Update UI to show "Change Reviewers" button for all users viewing a draft
- Display current requested reviewers and approvers under the draft definition (GitHub PR style)

**Files to modify**:

- `backend/glossary/models.py`
- `frontend/src/app/components/review-dashboard/review-dashboard.component.html`
- `frontend/src/app/components/my-drafts/my-drafts.component.html` (new)

## 5. Right-size E2E Tests

**Current state**:

- ~1975 lines of e2e tests across 7 spec files
- ~1309 lines of backend unit/integration tests

**Goal**: Reduce e2e tests to focus on main flows, rely more on unit/integration tests

**Consolidation strategy**:

- **Keep (streamlined)**: 
- `auth.spec.ts` - Reduce to 1-2 login tests, 1 session test (remove form validation, accessibility, permission details)
- `term-management.spec.ts` - Keep main CRUD flow (create, edit, search), remove edge cases
- `review-approval.spec.ts` - Keep core approval workflow (1-2 tests), remove detailed permission tests

- **Remove entirely**:
- `review.spec.ts` - Redundant with review-approval.spec.ts
- `reviewer-selection.spec.ts` - Move to unit tests
- `domain-reviewer.spec.ts` - Move to unit tests

- **Enhance backend/frontend unit tests** to cover:
- Form validation (currently in e2e auth tests)
- Permission checks (currently in e2e)
- Reviewer selection logic (currently in e2e)
- Search/filtering edge cases (currently in e2e)

**Target**: Reduce e2e tests to ~500-700 lines covering critical user journeys only

### To-dos

- [ ] Rename terminology in backend: Domain→Perspective, DomainExpert→PerspectiveCurator, EntryVersion→EntryDraft (models, serializers, views, admin, tests, migrations)
- [ ] Rename terminology in frontend: Domain→Perspective, expert→curator, version→draft (models, services, components, templates)
- [ ] Fix Review view filtering: implement proper showAll checkbox behavior to filter by requested reviewers
- [ ] Add 'My Drafts' tab: create component, route, backend endpoint to show user's own drafts with review progress
- [ ] Enable anyone to change requested reviewers: remove author-only restriction, update UI to show reviewers GitHub PR-style
- [ ] Right-size e2e tests: consolidate to ~500-700 lines covering main flows, remove redundant tests, enhance unit tests