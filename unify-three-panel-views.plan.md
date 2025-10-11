<!-- 98e87fa4-b73a-454b-a5b2-262ffdccdd04 596a97a6-eca8-41d9-a531-8e998200af9b -->
# Unify Three Panel Views

## Overview

The three views (Glossary, Review, My Drafts) have diverged significantly in their implementations, leading to bugs and inconsistent behavior. This plan will unify them by extracting shared logic into services and base classes while keeping separate view components for their specific contexts.

## Current Problems

1. **Edit functionality broken in My Drafts**: Uses PATCH with original content instead of creating new draft
2. **No edit in Review**: Should support editing now that anyone can edit latest version  
3. **Version History missing**: Only in Glossary, should be in all three views
4. **Version History incomplete**: Cannot select a historical draft to view in the bottom panel
5. **Inconsistent content display**: Different structures for showing latest vs published content

## Target State: Unified Features

| Feature | Glossary | Review | My Drafts |
|---------|----------|--------|-----------|
| **Edit UI** | ✅ DefinitionForm + Quill | ✅ DefinitionForm + Quill | ✅ DefinitionForm + Quill |
| **Edit Behavior** | ✅ Creates new draft | ✅ Creates new draft | ✅ Creates new draft |
| **Version History** | ✅ Shows sidebar | ✅ Shows sidebar | ✅ Shows sidebar |
| **Published Version Section** | ✅ When exists | ✅ When exists | ✅ When exists |
| **Latest Draft Section** | ✅ When unpublished | ✅ When unpublished | ✅ When unpublished |
| **Historical Draft Section** | ✅ Replaces Published | ✅ Replaces Published | ✅ Replaces Published |
| **Perspective Tabs** | ✅ All perspectives | ❌ Single draft | ❌ Single draft |
| **Comments** | ✅ With positions | ✅ With positions | ✅ With positions |
| **Approve Button** | ❌ Not applicable | ✅ When eligible | ❌ Not applicable |
| **Publish Button** | ❌ Not applicable | ✅ When eligible | ✅ When eligible |
| **Request Review Button** | ❌ Not applicable | ✅ Shown | ✅ Shown |
| **Endorse Button** | ✅ When eligible | ❌ Not applicable | ❌ Not applicable |
| **Edit Button** | ✅ Always shown | ✅ Always shown | ✅ Always shown |
| **Data Loading** | ✅ EntryDetailService | ✅ EntryDetailService | ✅ EntryDetailService |

**Unified Elements** (same across all views):

- DefinitionForm + Quill editor with entry link selector
- Always create new drafts on save (linear draft history)
- Version history sidebar with draft selection
- Latest Draft / Published Version / Historical Draft sections
- Comments with draft position indicators
- Shared business logic via EntryDetailService

**View-Specific Elements**:

- **Glossary**: Perspective tabs, Endorse button, no workflow buttons
- **Review**: Approve/Publish buttons, single draft context
- **My Drafts**: Publish/Request Review buttons, no Approve button

## Key Architectural Decisions

- Keep separate view components (term-detail, draft-detail-panel) but unify their logic
- Extract shared editing logic into a service
- All views use DefinitionForm + Quill editor for editing
- All views always create new drafts (linear draft history)
- All views show Version History sidebar consistently
- Selected historical draft shows in bottom section, replacing "Published Version" section

## Implementation Plan

### Phase 1: Create Shared Entry Detail Service

**File**: `frontend/src/app/services/entry-detail.service.ts` (new)

This service will encapsulate all shared logic for:

- Loading entry data (drafts, comments, history)
- Editing workflow (initializing edit content, saving drafts)
- Comment operations
- Version history management

Key methods:

- `loadDraftHistory(entryId: number): Observable<EntryDraft[]>`
- `loadCommentsWithPositions(entryId: number): Observable<Comment[]>`
- `getLatestDraft(entryId: number): Observable<EntryDraft | null>`
- `getPublishedDraft(entryId: number): Observable<EntryDraft | null>`
- `initializeEditContent(entry: Entry | ReviewDraft): string`
- `createNewDraft(entryId: number, content: string, authorId: number): Observable<EntryDraft>`

### Phase 2: Create Base Entry Detail Component Class

**File**: `frontend/src/app/components/shared/base-entry-detail.component.ts` (new)

An abstract base class containing shared logic:

- State management (isEditMode, editContent, comments, draftHistory, etc.)
- Edit workflow methods (onEditClick, onSaveEdit, onCancelEdit)
- Comment handlers (onCommentAdded, onCommentResolved, onCommentUnresolved)
- Version history handlers (toggleVersionHistory, onDraftSelected)
- Display helper methods (hasUnpublishedDrafts, getPublishedDraft, getLatestDraftContent, getPublishedContent)

This base class will use the EntryDetailService and provide common functionality that both term-detail and draft-detail-panel can inherit from or compose.

### Phase 3: Fix My Drafts Edit Functionality

**Files**:

- `frontend/src/app/components/my-drafts/my-drafts.component.ts`
- `frontend/src/app/components/shared/draft-detail-panel/draft-detail-panel.component.ts`
- `frontend/src/app/components/shared/draft-detail-panel/draft-detail-panel.component.html`

**Changes**:

1. **Remove broken PATCH logic** from my-drafts.component.ts:

- Delete `toggleEditMode()` method
- Delete `saveDraft()` method (lines 272-316)
- Delete `editingDraft` and `editContent` state variables

2. **Add proper edit workflow** using shared service:

- Import and use EntryDetailService
- Use `createNewDraft()` instead of `updateEntryDraft()`
- Initialize edit content from latest draft, not the selected ReviewDraft

3. **Replace textarea with DefinitionForm** in draft-detail-panel.component.html:

- Import DefinitionFormComponent
- Replace textarea (lines 108-113) with `<app-definition-form>`
- Use same Quill editor configuration as term-detail

4. **Update draft-detail-panel inputs/outputs**:

- Remove `editingDraft` input (editing state managed internally)
- Remove `editContent` input/output (managed by DefinitionForm)
- Add `entryId` input for draft creation
- Update `saveEdit` output to emit without content parameter

### Phase 4: Add Edit Functionality to Review View

**Files**:

- `frontend/src/app/components/review-dashboard/review-dashboard.component.ts`
- `frontend/src/app/components/review-dashboard/review-dashboard.component.html`
- `frontend/src/app/components/shared/draft-detail-panel/draft-detail-panel.component.ts`

**Changes**:

1. **Enable edit in draft-detail-panel** when used in Review context:

- Change `canEdit` input from hardcoded `false` to dynamic value
- Add logic to determine if current user can edit (any user can edit latest version)

2. **Add edit handlers** in review-dashboard.component.ts:

- Add `isEditMode` state variable
- Add `onEditRequested()`, `onEditSaved()`, `onEditCancelled()` handlers
- Use EntryDetailService to create new draft on save

3. **Update draft-detail-panel template** to show Edit button in Review context

### Phase 5: Add Version History to Review and My Drafts

**Files**:

- `frontend/src/app/components/shared/draft-detail-panel/draft-detail-panel.component.ts`
- `frontend/src/app/components/shared/draft-detail-panel/draft-detail-panel.component.html`
- `frontend/src/app/components/my-drafts/my-drafts.component.ts`
- `frontend/src/app/components/review-dashboard/review-dashboard.component.ts`

**Changes**:

1. **Add version history to draft-detail-panel**:

- Import VersionHistorySidebarComponent
- Add `showVersionHistory` state variable
- Add `draftHistory` state variable
- Add `toggleVersionHistory()` method
- Load draft history when draft is selected
- Add version history sidebar to template

2. **Wire up in parent components** (my-drafts, review-dashboard):

- Pass necessary props to draft-detail-panel
- Handle version history events

### Phase 6: Implement Historical Draft Selection

**Files**:

- `frontend/src/app/components/shared/version-history-sidebar/version-history-sidebar.component.ts`
- `frontend/src/app/components/term-detail/term-detail.component.ts`
- `frontend/src/app/components/shared/draft-detail-panel/draft-detail-panel.component.ts`

**Changes**:

1. **Update version-history-sidebar** to emit draft selection:

- Already has `draftSelected` output, ensure it fires on click

2. **Handle draft selection in term-detail**:

- Update `onDraftSelected(draft)` method to show selected draft in bottom section
- Add `selectedHistoricalDraft` state variable
- When historical draft selected, show it in place of "Published Version" section
- Add label indicating "Historical Draft (selected from version history)"

3. **Handle draft selection in draft-detail-panel**:

- Add same logic as term-detail
- Show selected historical draft in bottom section
- Replace the "Published Version" section with selected draft content

### Phase 7: Unify Content Display Structure

**Files**:

- `frontend/src/app/components/shared/draft-detail-panel/draft-detail-panel.component.html`
- `frontend/src/app/components/term-detail/term-detail.component.html`

**Changes**:

1. **Standardize section structure** across both components:

- Top section: Current/Latest Draft (or edit form when editing)
- Bottom section: Either "Published Version" OR "Historical Draft" (when selected from version history)
- Use consistent styling, labels, and layout

2. **Both should support**:

- Latest Draft section with blue background
- Published Version section with green background  
- Historical Draft section with gray/purple background (when selected)
- Author and timestamp metadata for each section

### Phase 8: Unify Comment Loading

**Files**:

- `frontend/src/app/components/review-dashboard/review-dashboard.component.ts`
- `frontend/src/app/components/my-drafts/my-drafts.component.ts`
- `frontend/src/app/components/shared/draft-detail-panel/draft-detail-panel.component.ts`

**Changes**:

1. **Use `getCommentsWithDraftPositions()`** in all three views:

- Replace `getComments()` calls with `getCommentsWithDraftPositions()`
- Add fallback to basic `getComments()` if new endpoint not available
- Ensure comment components display draft position indicators

2. **Move comment loading logic** to EntryDetailService:

- Centralize comment loading with consistent error handling
- All components use the same method

### Phase 9: Testing and Validation

**Focus areas**:

1. **Edit functionality**:

- Glossary: Edit creates new draft ✓ (already works)
- Review: Edit creates new draft (new functionality)
- My Drafts: Edit creates new draft (fixed from broken PATCH)

2. **Version History**:

- All three views show version history sidebar
- Clicking a historical draft shows it in bottom panel
- Bottom panel correctly labels selected draft

3. **Content Display**:

- Latest Draft section appears consistently when unpublished drafts exist
- Published Version section appears consistently in all views
- Historical Draft section replaces Published Version when selected

4. **Comments**:

- All views load comments with draft position indicators
- Comment operations work consistently

## Files to Create

1. `frontend/src/app/services/entry-detail.service.ts` - Shared business logic
2. `frontend/src/app/components/shared/base-entry-detail.component.ts` - Base component class

## Files to Modify

### Core Components

1. `frontend/src/app/components/term-detail/term-detail.component.ts`
2. `frontend/src/app/components/term-detail/term-detail.component.html`
3. `frontend/src/app/components/shared/draft-detail-panel/draft-detail-panel.component.ts`
4. `frontend/src/app/components/shared/draft-detail-panel/draft-detail-panel.component.html`

### Parent Components

5. `frontend/src/app/components/glossary-view/glossary-view.component.ts`
6. `frontend/src/app/components/review-dashboard/review-dashboard.component.ts`
7. `frontend/src/app/components/review-dashboard/review-dashboard.component.html`
8. `frontend/src/app/components/my-drafts/my-drafts.component.ts`
9. `frontend/src/app/components/my-drafts/my-drafts.component.html`

### Supporting Components

10. `frontend/src/app/components/shared/version-history-sidebar/version-history-sidebar.component.ts`
11. `frontend/src/app/components/shared/version-history-sidebar/version-history-sidebar.component.html`

## Success Criteria

1. ✅ All three views use DefinitionForm + Quill editor for editing
2. ✅ All edits create new drafts (no PATCH to existing drafts)
3. ✅ Version History sidebar appears in all three views
4. ✅ Selecting a historical draft shows it in the bottom panel
5. ✅ Published Version section appears consistently in all views
6. ✅ Edit functionality works correctly in all views
7. ✅ No code duplication - shared logic extracted to service/base class
8. ✅ Existing tests updated and passing

### To-dos

- [ ] Create EntryDetailService with shared business logic for loading drafts, comments, and handling edit workflow
- [ ] Create base component class with shared state management and handler methods
- [ ] Fix My Drafts edit functionality to create new drafts instead of PATCH, use DefinitionForm
- [ ] Add edit functionality to Review view using shared service and DefinitionForm
- [ ] Add Version History sidebar to Review and My Drafts views
- [ ] Implement historical draft selection showing selected draft in bottom panel
- [ ] Standardize content display structure across all three views
- [ ] Use getCommentsWithDraftPositions() consistently in all three views
- [ ] Test edit functionality, version history, content display, and comments across all views