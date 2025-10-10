<!-- 5351025e-b343-4c43-a450-c7d25f40bf62 7ee303c4-6183-4b23-85ba-a64943393e3c -->
# Frontend Code Consolidation Refactoring

## Overview

Refactor the Glossary, Review Dashboard, and My Drafts pages to eliminate code duplication by creating shared components, utilities, and standardizing visual patterns.

## Key Files to Modify

- `/Users/wolfe/termageddon/frontend/src/app/components/review-dashboard/` (394 lines TS + 339 lines HTML)
- `/Users/wolfe/termageddon/frontend/src/app/components/my-drafts/` (321 lines TS + 290 lines HTML)
- `/Users/wolfe/termageddon/frontend/src/app/components/term-detail/` (comments logic)
- `/Users/wolfe/termageddon/frontend/src/app/components/glossary-view/` (layout patterns)

## New Shared Components to Create

### 1. **DraftDetailPanelComponent**

Extract the right-side detail panel used in both Review Dashboard and My Drafts:

- **Location**: `/frontend/src/app/components/shared/draft-detail-panel/`
- **Purpose**: Display draft content, metadata, approvers, requested reviewers, and actions
- **Inputs**: `draft`, `canEdit`, `canPublish`, `canApprove`, `showPublishButton`, `showRequestReviewButton`
- **Outputs**: `approve`, `publish`, `requestReview`, `edit`
- **Consolidates**: 200+ lines of duplicated HTML between review-dashboard and my-drafts

### 2. **DraftListItemComponent**

Extract the list item card pattern:

- **Location**: `/frontend/src/app/components/shared/draft-list-item/`
- **Purpose**: Reusable card for displaying draft summaries in lists
- **Inputs**: `draft`, `selected`, `showStatus`, `statusType`
- **Outputs**: `clicked`
- **Consolidates**: List item rendering across both pages

### 3. **MasterDetailLayoutComponent**

Base layout wrapper for all three pages:

- **Location**: `/frontend/src/app/components/shared/master-detail-layout/`
- **Purpose**: Consistent left-right split layout with responsive sizing
- **Content Projection**: `<ng-content select="[sidebar]">` and `<ng-content select="[detail]">`
- **Consolidates**: Layout structure and sizing logic

### 4. **SearchFilterBarComponent**

Unified search/filter UI:

- **Location**: `/frontend/src/app/components/shared/search-filter-bar/`
- **Purpose**: Consistent search box with optional filters
- **Inputs**: `placeholder`, `filters` (array of filter configs), `showClearButton`
- **Outputs**: `search`, `filterChanged`, `cleared`

## Shared Utilities/Services

### 5. **CommentMixin or CommentManager Utility**

Extract common comment logic:

- **Location**: `/frontend/src/app/utils/comment-manager.ts`
- **Methods**: `loadComments()`, `handleCommentAdded()`, `handleCommentResolved()`, `handleCommentUnresolved()`
- **Consolidates**: ~50 lines duplicated across 3 components

### 6. **DraftStatusUtility**

Centralize draft status logic:

- **Location**: `/frontend/src/app/utils/draft-status.util.ts`
- **Functions**: `getDraftStatus()`, `getDraftStatusClass()`, `getApprovalStatusText()`, `getEligibilityClass()`
- **Consolidates**: Status badge styling and text logic

### 7. **UserUtility**

User-related helpers:

- **Location**: `/frontend/src/app/utils/user.util.ts`
- **Functions**: `getInitials(user)`, `formatUserName(user)`, `getUserAvatar(user)`

## Visual Standardization

### 8. **Shared Status Badge Styles**

- **Location**: `/frontend/src/styles.scss` or new `/frontend/src/app/styles/draft-status.scss`
- **Classes**: Standardize status-published, status-approved, status-ready, status-pending, eligibility badges
- **Consolidates**: Status styling from my-drafts.component.scss

### 9. **Consistent Metadata Display**

Standardize author/timestamp/approvers display across all three pages:

- Use shared component or template patterns
- Consistent avatar circles for approvers/reviewers

## Refactoring Steps

### Phase 1: Extract Utilities (Low Risk)

1. Create `draft-status.util.ts` and `user.util.ts`
2. Create `comment-manager.ts` utility class
3. Update components to use utilities
4. Run tests to verify no regressions

### Phase 2: Create Shared Components

5. Build `DraftDetailPanelComponent` with comprehensive inputs/outputs
6. Build `DraftListItemComponent` for list rendering
7. Build `SearchFilterBarComponent`
8. Build `MasterDetailLayoutComponent`
9. Add shared status styles to global SCSS

### Phase 3: Refactor Existing Components

10. Refactor **My Drafts** to use new shared components
11. Refactor **Review Dashboard** to use new shared components
12. Refactor **Glossary View** to use `MasterDetailLayoutComponent`
13. Update `TermDetailComponent` to use comment utilities

### Phase 4: Testing & Validation

14. Run all existing unit tests (`npm test`)
15. Run E2E tests (`npm run e2e`)
16. Manual testing of all three pages
17. Verify responsive behavior and styling consistency

## Expected Outcomes

- **Remove ~400 lines** of duplicated TypeScript code
- **Remove ~300 lines** of duplicated HTML templates
- **Standardize** UI/UX across all three main pages
- **Improve maintainability** - changes to draft display logic only need to happen once
- **All existing tests pass** without modification (or minimal updates)

## Rollback Plan

- Each phase is independent and can be committed separately
- If issues arise, can revert specific commits without losing all progress
- Keep original components intact until new components are fully tested

### To-dos

- [ ] Create shared utility files: draft-status.util.ts, user.util.ts, and comment-manager.ts
- [ ] Extract and standardize status badge styles in shared SCSS
- [ ] Build DraftDetailPanelComponent to consolidate right-side detail view
- [ ] Build DraftListItemComponent for list rendering
- [ ] Build SearchFilterBarComponent for unified search/filter UI
- [ ] Build MasterDetailLayoutComponent for consistent layout structure
- [ ] Refactor MyDraftsComponent to use new shared components
- [ ] Refactor ReviewDashboardComponent to use new shared components
- [ ] Update GlossaryView and TermDetailComponent to use shared utilities and layout
- [ ] Run all unit tests and E2E tests to ensure no regressions