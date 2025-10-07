<!-- 78f8d3cb-2d01-4661-ae33-dd106754fe9c a97d6ec1-4598-4ee7-9958-01151cac38c8 -->
# E2E Test Improvement Plan

## Current Issues Identified

After analyzing the e2e tests, I've identified several critical problems:

### 1. **DOM Brittleness**

- Tests rely heavily on fragile CSS selectors (`h3.cursor-pointer`, `.bg-orange-100`, `button[class*="px-3"]`)
- Complex class-based selectors break when styling changes
- No test-specific identifiers (data-testid attributes)

### 2. **Poor Separation of Concerns**

- Page interaction logic mixed directly in test assertions
- Repeated login flow in every test file (7+ times)
- Duplicated selectors across multiple test files
- No abstraction of common workflows

### 3. **Excessive Timeouts and Waits**

- Heavy use of `waitForTimeout()` (1000-3000ms) - anti-pattern
- Timing-based waits instead of condition-based waits
- Creates flaky tests and slow execution

### 4. **Inadequate Test Data Management**

- Tests depend on specific content ("absorption", "admin")
- No test data setup/teardown strategy
- State pollution between tests

### 5. **Weak Assertions**

- Tests check for generic UI elements rather than business logic
- Many conditional tests (`if (hasButton)`) that pass regardless
- Console logging used for debugging instead of proper assertions

## Solution: Comprehensive Refactoring

### Architecture Changes

#### 1. **Page Object Model (POM) Implementation**

Create page objects for each major component/page:

- `LoginPage.ts` - Login interactions
- `GlossaryPage.ts` - Glossary list and navigation
- `TermDetailPage.ts` - Term viewing and editing
- `ReviewPage.ts` - Review dashboard operations
- `BasePage.ts` - Common utilities (waits, navigation)

#### 2. **Add Test-Specific Attributes to Components**

Update Angular component templates to include `data-testid` attributes:

- `login.component.html`: Add to username/password inputs, submit button
- `term-detail.component.html`: Add to edit button, save/cancel buttons, content area
- `term-list.component.html`: Add to term items, search, domain filter
- `review-dashboard.component.html`: Add to approve/publish buttons, version items

#### 3. **Test Fixtures and Helpers**

Create utility modules:

- `fixtures/testData.ts` - Predefined test users, terms, domains
- `helpers/auth.ts` - Reusable authentication helpers
- `helpers/api.ts` - API mocking and test data setup

#### 4. **Reorganize Test Structure**

Group tests by user journeys rather than technical features:

- `auth.spec.ts` - Authentication flows only
- `term-management.spec.ts` - Create, edit, view terms
- `review-approval.spec.ts` - Full review and approval workflows
- `endorsement.spec.ts` - Endorsement workflows
- `domain-navigation.spec.ts` - Multi-domain term navigation

### Implementation Details

#### Page Object Example Structure

```typescript
// pages/TermDetailPage.ts
export class TermDetailPage {
  constructor(private page: Page) {}
  
  // Locators using data-testid
  get editButton() { return this.page.getByTestId('term-edit-button'); }
  get saveButton() { return this.page.getByTestId('term-save-button'); }
  get contentArea() { return this.page.getByTestId('term-content'); }
  
  // Business logic methods
  async editDefinition(content: string) {
    await this.editButton.click();
    await this.contentArea.fill(content);
    await this.saveButton.click();
    await this.waitForSaveComplete();
  }
  
  async waitForSaveComplete() {
    // Replace timeout with condition
    await expect(this.editButton).toBeVisible();
  }
}
```

#### Fixture Example

```typescript
// fixtures/testData.ts
export const TEST_USERS = {
  ADMIN: { username: 'admin', password: 'admin' },
  REVIEWER: { username: 'mariacarter', password: 'mariacarter' }
};

export const TEST_TERMS = {
  WITH_DEFINITION: 'absorption',
  WITHOUT_DEFINITION: 'test-empty-term'
};
```

### Test Improvements by File

**auth.spec.ts** (3 tests, keep focused on auth):

- Use LoginPage object
- Remove redundant redirect tests
- Add session management tests

**glossary.spec.ts** (REMOVE - too granular):

- Functionality absorbed into term-management.spec.ts
- Most tests are UI element checks, not user journeys

**term-editing.spec.ts** (REMOVE - merge into term-management.spec.ts):

- Duplicate of save-definition tests
- Redundant coverage

**save-definition.spec.ts** (REFACTOR → term-management.spec.ts):

- Reduce from 6 to 3 meaningful tests
- Focus on: successful save, validation, cancel workflow
- Use TermDetailPage object

**review.spec.ts** (REFACTOR → review-approval.spec.ts):

- Simplify from 16 to 8 tests
- Remove UI-checking tests (lines 13-50)
- Focus on approval workflow, eligibility, and publishing

**publish-workflow.spec.ts** (MERGE into review-approval.spec.ts):

- Publishing is part of review workflow
- Redundant with review.spec.ts

**auth-protection.spec.ts** (SIMPLIFY):

- Reduce from 7 to 3 tests
- Use auth helper for setup

**domain-switching.spec.ts** (KEEP but refactor):

- Single focused test is good
- Use TermDetailPage

**reviewer-selection.spec.ts** (KEEP but refactor):

- Use ReviewPage object
- Reduce conditional logic

**edit-during-approval.spec.ts** (MERGE into term-management.spec.ts):

- Complex workflow test fits better in comprehensive term tests

**debug-save.spec.ts** (DELETE):

- Debug test shouldn't be in production test suite

### Key Benefits

1. **Maintainability**: Changes to UI require updates in one place (page objects)
2. **Readability**: Tests read like user stories, not DOM queries
3. **Reliability**: Data-testid attributes won't break with style changes
4. **Speed**: Condition-based waits instead of arbitrary timeouts
5. **Coverage**: Better organized tests provide clearer coverage picture

### Migration Strategy

**Option A: Clean Rewrite** (Recommended)

- Start fresh with POM structure
- Write new tests following patterns
- Faster than refactoring heavily flawed tests
- Estimated: ~40 high-quality tests vs current ~50+ brittle tests

**Option B: Incremental Refactoring**

- Add data-testid to components first
- Create page objects
- Refactor tests one at a time
- More gradual but slower overall

## Files to Create/Modify

**New Files:**

- `/frontend/e2e/pages/BasePage.ts`
- `/frontend/e2e/pages/LoginPage.ts`
- `/frontend/e2e/pages/GlossaryPage.ts`
- `/frontend/e2e/pages/TermDetailPage.ts`
- `/frontend/e2e/pages/ReviewPage.ts`
- `/frontend/e2e/fixtures/testData.ts`
- `/frontend/e2e/helpers/auth.ts`
- `/frontend/e2e/term-management.spec.ts`
- `/frontend/e2e/review-approval.spec.ts`

**Modified Component Files:**

- `/frontend/src/app/components/login/login.component.html`
- `/frontend/src/app/components/term-detail/term-detail.component.html`
- `/frontend/src/app/components/term-list/term-list.component.html`
- `/frontend/src/app/components/review-dashboard/review-dashboard.component.html`
- `/frontend/src/app/components/glossary-view/glossary-view.component.html`

**Refactored Test Files:**

- `/frontend/e2e/auth.spec.ts`
- `/frontend/e2e/domain-switching.spec.ts`
- `/frontend/e2e/reviewer-selection.spec.ts`

**Delete:**

- `/frontend/e2e/debug-save.spec.ts`
- `/frontend/e2e/glossary.spec.ts`
- `/frontend/e2e/term-editing.spec.ts`
- `/frontend/e2e/save-definition.spec.ts` (merged into term-management)
- `/frontend/e2e/publish-workflow.spec.ts` (merged into review-approval)
- `/frontend/e2e/edit-during-approval.spec.ts` (merged into term-management)
- `/frontend/e2e/auth-protection.spec.ts` (consolidated into auth.spec.ts)

## Backend Enhancements (implemented)

These are already staged/added in the backend and should be leveraged by the frontend and tests:

- [x] Serializer fields to drive review UI state in `EntryVersion` serializers
  - `can_approve_by_current_user`, `approval_status_for_user`, `user_has_approved`, `remaining_approvals`, `approval_percentage`
- [x] Serializer fields to drive entry-level permissions in `EntryListSerializer`
  - `can_user_endorse`, `can_user_edit`
- [x] `EntryViewSet` actions
  - `grouped_by_term` (GET): list entries grouped by term with the same filtering as list
  - `create_with_term` (POST): atomically create a `Term` and `Entry`
- [x] `EntryVersionViewSet` filtering/query enhancements
  - Query param `search`: full-text style filtering across term/domain/author/content
  - Query param `eligibility`: `can_approve` | `own` | `already_approved`
  - Respect `show_all=true` to bypass relevance filter; otherwise show authored/approved/needs-approval
- [x] `system-config` endpoint (GET) to expose settings needed by frontend
  - returns `MIN_APPROVALS`, `DEBUG`

### API contracts for new/updated endpoints

- Review/version list with user-centric fields

```http
GET /api/entry-versions/?eligibility=can_approve&search=absorb&show_all=false
```

Example shape (fields relevant to UI):

```json
{
  "id": 123,
  "approval_count": 1,
  "is_published": false,
  "can_approve_by_current_user": true,
  "approval_status_for_user": "can_approve",
  "user_has_approved": false,
  "remaining_approvals": 1,
  "approval_percentage": 50
}
```

- Entries grouped by term (for glossary screens)

```http
GET /api/entries/grouped_by_term/?domain=1&search=cache
```

Example shape:

```json
[
  {
    "term": {
      "id": 10,
      "text": "Cache",
      "text_normalized": "cache",
      "is_official": true
    },
    "entries": [
      {
        "id": 201,
        "domain": { "id": 1, "name": "General" },
        "active_version": { "id": 999, "approval_count": 2 },
        "can_user_endorse": true,
        "can_user_edit": true
      }
    ]
  }
]
```

- Atomic create term + entry

```http
POST /api/entries/create_with_term/
Content-Type: application/json

{
  "term_text": "New Term",
  "domain_id": 1,
  "is_official": false
}
```

Returns the created `Entry` via the standard serializer.

- System configuration for UI logic

```http
GET /api/system-config/
```

Example:

```json
{ "MIN_APPROVALS": 2, "DEBUG": true }
```

### Frontend consumption plan

- Use `system-config` to show required approvals and progress bars (via `approval_percentage`).
- Replace ad-hoc logic with `approval_status_for_user` and `can_approve_by_current_user` to enable/disable Approve buttons.
- Use `can_user_endorse` and `can_user_edit` to conditionally render Endorse/Edit controls.
- Glossary list should call `grouped_by_term` to simplify rendering and reduce client-side grouping.
- Review screens should use `eligibility` and `search` query params for focused queues.

## Recommendation

**I recommend Option A: Clean Rewrite**. The current tests have fundamental architectural issues that make refactoring more time-consuming than starting fresh with proper patterns. This approach will result in a more maintainable, reliable test suite that actually validates user workflows rather than DOM structure.

### To-dos

- [ ] Add data-testid attributes to all Angular component templates for stable test selectors
- [ ] Create Page Object Model classes (BasePage, LoginPage, GlossaryPage, TermDetailPage, ReviewPage)
- [ ] Create test fixtures and helper utilities (testData.ts, auth.ts helpers)
- [ ] Write new authentication tests using page objects and helpers
- [ ] Write comprehensive term-management.spec.ts covering CRUD operations and workflows
- [ ] Write review-approval.spec.ts covering approval and publishing workflows
- [ ] Write domain-switching and reviewer-selection tests with page objects
- [ ] Delete obsolete test files after verifying new tests provide equivalent or better coverage
- [ ] Update playwright.config.ts to optimize timeout settings and remove unnecessary configs
- [ ] Run full test suite and verify all critical user journeys are covered
- [ ] Wire frontend to new backend filters/endpoints (`eligibility`, `search`, `grouped_by_term`, `create_with_term`, `system-config`)
- [ ] Add unit tests for new serializer fields and view actions (Django)