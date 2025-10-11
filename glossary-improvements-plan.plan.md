<!-- 4b22e4c3-86b3-4246-8448-8412c78b5e6f a8cb51ef-fdde-4dcd-87f7-71c6df848531 -->
# Glossary System Improvements

## 1. Fix Filter Box Bug on Review and My Drafts Pages

**Issue**: Filter box doesn't work on Review and My Drafts pages.

**Solution**: Update My Drafts to use backend search like Review does.

**Files to modify**:

- `frontend/src/app/components/my-drafts/my-drafts.component.ts` - Change `onSearch()` to use backend search via `reviewService.searchDrafts()` instead of client-side filtering

## 2. Implement Linear Draft History System

**Current behavior**: Editing updates draft in-place, one unpublished draft per author per entry.

**New behavior**: Each save creates a new draft version, draft history is global (not per-author).

**Backend changes**:

- `backend/glossary/models.py`:
- Remove the "max 1 unpublished draft per author" validation in `EntryDraft.clean()`
- Update `EntryDraft` to track which draft it replaces (add optional `replaces_draft` ForeignKey)
- Keep comments attached to specific drafts (already done via GenericForeignKey)

- `backend/glossary/views.py`:
- Add endpoint to get all drafts for an entry (version history)
- Add comment retrieval logic that fetches comments from current draft and ancestor drafts back to last published version
- Update draft create logic to set `replaces_draft` to the latest draft when saving

- `backend/glossary/serializers.py`:
- Add `replaces_draft` field to serializers
- Add endpoint for fetching comment display list with draft position indicators

**Frontend changes**:

- `frontend/src/app/models/index.ts` - Add `replaces_draft` to ReviewDraft interface
- `frontend/src/app/components/term-detail/term-detail.component.ts`:
- When clicking "Edit" on published entry, populate edit form with latest draft content (not published content)
- Show "Latest Draft" section if unpublished drafts exist
- Show "Published Version" section separately
- Each save creates new draft

## 3. Comment Display with Draft Position Indicators

**Backend logic** (in views or serializers):

- Filter comments: show unresolved comments from drafts created after last published version
- Calculate draft position for each comment (e.g., "3 drafts ago", "current draft", "published")
- Count based on all drafts for the entry (global, not per-author)

**Frontend display**:

- Show comment with draft position label
- Display as if comments are "on" the current draft (even though linked to ancestor drafts in data model)

**Files to modify**:

- `backend/glossary/views.py` - Add comment filtering endpoint with draft position calculation
- `frontend/src/app/components/comment-thread/comment-thread.component.*` - Display draft position indicators
- `frontend/src/app/models/index.ts` - Add `draft_position` to Comment interface

## 4. Notification System

**Requirements**:

- Reserve fixed header space for notifications
- Show for 5 seconds, then fade out over 3 seconds (8 seconds total)
- No dismissal needed for info notifications
- Replace browser `alert()` with custom confirmation dialogs for actions requiring user choice

**Files to create/modify**:

- `frontend/src/app/components/shared/notification-bar/notification-bar.component.*` - New notification component
- `frontend/src/app/components/shared/confirmation-dialog/confirmation-dialog.component.*` - New confirmation dialog
- `frontend/src/app/services/notification.service.ts` - Service to manage notifications
- `frontend/src/app/app.component.*` - Add notification bar to main layout
- Replace all `alert()` calls across frontend components

## 5. Entry Link Selector in Editor

**Requirement**: Add link button to Quill toolbar that opens modal to select an entry (term + perspective) and insert link in WYSIWYG editor.

**Files to create/modify**:

- `frontend/src/app/components/shared/entry-link-selector-dialog/entry-link-selector-dialog.component.*` - New modal component
- `frontend/src/app/components/definition-form/definition-form.component.ts` - Add custom Quill toolbar button that opens modal and inserts link

## 6. Version History Widget

**Requirements**:

- Right sidebar (narrow, scrollable) shows version history for any view (Glossary, Review, My Drafts)
- Display: date saved, author name
- Indicate which versions were published and/or endorsed
- When selecting a historical draft: show that draft in main area, show latest draft in "Current Version" section

**Files to create/modify**:

- `frontend/src/app/components/shared/version-history-sidebar/version-history-sidebar.component.*` - New sidebar component
- `frontend/src/app/services/glossary.service.ts` - Add method to fetch draft history for entry
- Update view components (term-detail, draft-detail-panel) to integrate version history sidebar
- Add toggle button to show/hide version history

## 7. Fix "Already Approved" Bug

**Issue**: After initial test data load, Pending Reviews shows items with 1/2 approvals as "Already approved".

**Investigation needed**: Check draft-list-item component approval status display logic and backend approval count.

**Files to check**:

- `frontend/src/app/components/shared/draft-list-item/draft-list-item.component.*`
- `backend/glossary/views.py` - Review approval count calculation

## 8. Improve Frontend Test Coverage

**Focus**: Quality over quantity - ensure critical user flows are tested.

**Areas to cover**:

- Filter/search functionality (now fixed)
- Draft creation and editing flows
- Comment display with draft positions
- Version history navigation
- Notification display and timing

**Files to update**:

- Test files in `frontend/src/app/components/*/` directories

### To-dos

- [ ] Fix filter box bug on My Drafts page by using backend search
- [ ] Implement backend changes for linear draft history (models, views, serializers)
- [ ] Implement backend comment filtering and draft position calculation
- [ ] Update frontend components to support linear draft history and edit workflow
- [ ] Update comment display with draft position indicators
- [ ] Create notification bar component and service with auto-fade functionality
- [ ] Create confirmation dialog component and replace all alert() calls
- [ ] Create entry link selector modal and integrate with Quill editor
- [ ] Create version history sidebar component and integrate with all views
- [ ] Investigate and fix 'Already approved' bug in Pending Reviews
- [ ] Add frontend tests for new functionality and critical user flows