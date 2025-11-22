<!-- e497e548-6f20-4fe2-b026-671d80743b87 23a0b041-9ebb-4f08-94b2-de40cc47de44 -->
# Implementation Plan: TODO Marked Features

## Overview

This plan implements all [Y] marked items from TODO.md, organized by priority and dependencies.

## 1. Security & Performance

### 1.1 Security Headers and CSRF Protection

**Files:** `backend/Termageddon/settings.py`

- Add security headers middleware configuration:
- `SECURE_BROWSER_XSS_FILTER = True`
- `SECURE_CONTENT_TYPE_NOSNIFF = True`
- `X_FRAME_OPTIONS = 'DENY'`
- `SECURE_HSTS_SECONDS` (production only)
- `SECURE_HSTS_INCLUDE_SUBDOMAINS` (production only)
- `SECURE_HSTS_PRELOAD` (production only)
- Enhance CSRF protection for API endpoints if needed
- Add `SECURE_REFERRER_POLICY` header

## 2. Search & Discovery

### 2.1 Full-Text Search with Highlighting

**Files:**

- `backend/glossary/views.py` (TermViewSet, EntryViewSet)
- `backend/glossary/serializers.py`
- `frontend/src/app/components/term-list/term-list.component.ts`
- `frontend/src/app/components/term-list/term-list.component.html`

**Backend:**

- Extend search to include `EntryDraft.content` and `Comment.text` fields
- Add search highlighting in serializers (mark matching terms that are prefixed with search query)
- Update `search_fields` in ViewSets to include draft content and comments

**Frontend:**

- Add highlighting logic in term list component
- Highlight terms in the list where the term text starts with the search query
- Use CSS classes for highlight styling

## 3. Data Management

### 3.1 Data Archiving for Old Drafts

**Files:**

- `backend/glossary/models.py` (EntryDraft model)
- `backend/glossary/management/commands/archive_old_drafts.py` (new)
- `backend/glossary/migrations/XXXX_add_archived_field.py` (new)

**Implementation:**

- Add `is_archived` boolean field to EntryDraft model
- Create management command to archive unpublished drafts older than 1 month
- Add migration for new field
- Update queries to exclude archived drafts by default (add `archived=False` filter)
- Add admin action or endpoint to manually archive/unarchive if needed

## 4. User Experience

### 4.1 Draft Comparison/Diff View

**Files:**

- `frontend/src/app/components/shared/draft-detail-panel/draft-detail-panel.component.ts`
- `frontend/src/app/components/shared/draft-detail-panel/draft-detail-panel.component.html`
- `frontend/src/app/components/shared/base-entry-detail.component.ts`
- `frontend/src/app/utils/diff.util.ts` (new)

**Implementation:**

- Create diff utility to compare HTML content between drafts
- Diff logic depends on context:
- **In Version History view**: Compare current draft with previous draft chronologically (shows "what changed to get here")
- **Outside Version History** (My Drafts, Review, etc.): Compare current draft with published version (shows "what's different from published")
- Add inline highlighting for additions (green) and deletions (red/strikethrough)
- Display diff view in read mode when viewing drafts
- Use a library like `diff` or `diff-match-patch` for HTML-aware diffing
- If no previous draft exists (first draft ever) or no published version exists, don't show diff

## 5. Collaboration Features

### 5.1 @Mentions in Comments

**Files:**

- `backend/glossary/models.py` (Comment model)
- `backend/glossary/serializers.py` (CommentCreateSerializer)
- `backend/glossary/views.py` (CommentViewSet)
- `frontend/src/app/components/comment-thread/comment-thread.component.ts`
- `frontend/src/app/components/comment-thread/comment-thread.component.html`
- `frontend/src/app/components/shared/user-mention-autocomplete/user-mention-autocomplete.component.ts` (new)
- `frontend/src/app/services/user.service.ts` (new or extend)

**Backend:**

- Add parsing logic to detect @mentions in comment text
- Store mentioned users in a ManyToMany field or parse on-the-fly
- Create notification when @mention is detected (see 5.3)

**Frontend:**

- Add @ trigger detection in comment input
- Create user autocomplete component that searches by full name
- Show dropdown with matching users when @ is typed
- Insert selected username into comment text
- Style @mentions in displayed comments

### 5.2 Comment Reactions (Thumbs Up)

**Files:**

- `backend/glossary/models.py` (new Reaction model or add to Comment)
- `backend/glossary/serializers.py`
- `backend/glossary/views.py` (CommentViewSet - add reaction endpoints)
- `backend/glossary/migrations/XXXX_add_comment_reactions.py` (new)
- `frontend/src/app/models/index.ts`
- `frontend/src/app/components/comment-thread/comment-thread.component.ts`
- `frontend/src/app/components/comment-thread/comment-thread.component.html`

**Implementation:**

- Create Reaction model: `Comment`, `User`, `reaction_type` (default: 'thumbs_up')
- Add endpoints: POST `/comments/{id}/react/`, DELETE `/comments/{id}/unreact/`
- Display reaction count and allow users to toggle their reaction
- Show which users reacted (optional: tooltip or expandable list)

### 5.3 In-App Notifications

**Files:**

- `backend/glossary/models.py` (new Notification model)
- `backend/glossary/serializers.py` (NotificationSerializer)
- `backend/glossary/views.py` (NotificationViewSet)
- `backend/glossary/migrations/XXXX_add_notifications.py` (new)
- `frontend/src/app/models/index.ts`
- `frontend/src/app/services/notification-api.service.ts` (new - different from existing NotificationService)
- `frontend/src/app/components/notifications/notifications-panel.component.ts` (new)
- `frontend/src/app/components/notifications/notifications-panel.component.html` (new)

**Backend:**

- Create Notification model: `user`, `type`, `message`, `related_draft`, `related_comment`, `is_read`, `created_at`
- Notification types: `draft_edited`, `draft_approved`, `mentioned_in_comment`, `review_requested`
- Create signals/hooks to generate notifications:
- When draft is edited (notify draft author if not the editor)
- When draft is approved (notify draft author)
- When @mentioned in comment (notify mentioned user)
- When review is requested (notify requested reviewers)
- Add endpoints: GET `/notifications/`, PATCH `/notifications/{id}/read/`, POST `/notifications/mark-all-read/`

**Frontend:**

- Create notification API service
- Create notifications panel component with tab/badge
- Display unread count in navigation
- Show list of notifications with ability to dismiss individually
- Mark as read when clicked/viewed
- Auto-refresh or use polling/websockets for new notifications

## 6. Comment System Refactoring

### 6.1 Update Comment Data Model

**Files:**

- `backend/glossary/models.py` (Comment model)
- `backend/glossary/migrations/XXXX_remove_generic_fk_from_comments.py` (new)
- `backend/glossary/migrations/XXXX_add_draft_fk_to_comments.py` (new)

**Implementation:**

- Remove `content_type` and `object_id` (GenericForeignKey)
- Add `draft: ForeignKey(EntryDraft)` field
- Create schema migration (no data migration needed - no production data)
- Update all comment creation/query logic to use draft FK instead of generic FK

### 6.2 Comment Display Logic

**Files:**

- `backend/glossary/views.py` (CommentViewSet - `with_draft_positions` method)
- `frontend/src/app/components/shared/draft-detail-panel/draft-detail-panel.component.ts`
- `frontend/src/app/components/shared/base-entry-detail.component.ts`
- `frontend/src/app/components/term-detail/term-detail.component.ts`
- `frontend/src/app/components/shared/version-history-sidebar/version-history-sidebar.component.ts`

**Backend:**

- Update `with_draft_positions` to only show comments on drafts since last published entry
- For entries without published drafts, show all comments
- Add filtering by draft_id when viewing version history

**Frontend:**

- Highlight comments on currently viewed draft
- Hide comments in Glossary view (term-detail) unless version history is open
- Show comment count in version history sidebar for each draft
- In version history view: disable commenting, show only comments for selected draft (including resolved)
- Add "X resolved" button in Review/My Drafts views to show resolved comments
- Show resolved comments in Version History view by default

### 6.3 Comment Editing

**Files:**

- `backend/glossary/views.py` (CommentViewSet - `perform_update`)
- `frontend/src/app/components/comment-thread/comment-thread.component.ts`
- `frontend/src/app/components/comment-thread/comment-thread.component.html`

**Implementation:**

- Backend already allows editing own comments (verify permission check)
- Add edit UI in comment thread component
- Show edit button on own comments
- Allow inline editing or modal for comment text
- Add `edited_at` timestamp if not already present

## Implementation Order

1. **Comment System Refactoring** (Foundation - affects many features)

- 6.1 Update data model
- 6.2 Update display logic
- 6.3 Add editing

2. **Security Headers** (Quick win, independent)

3. **Search with Highlighting** (Independent)

4. **Data Archiving** (Independent)

5. **Draft Diff View** (Depends on draft display logic)

6. **@Mentions** (Depends on comment system)

7. **Comment Reactions** (Depends on comment system)

8. **In-App Notifications** (Depends on @mentions and comment system)

## Testing Considerations

- Unit tests for all new models and business logic
- Integration tests for API endpoints
- Frontend component tests for new UI features
- Manual testing for comment display logic across different views
- Test data migration for comment model changes
- Test notification generation triggers

### To-dos

- [ ] Update Comment model to use EntryDraft FK instead of GenericForeignKey, create migrations
- [ ] Update comment display logic: show comments on drafts since last published, highlight current draft comments, hide in Glossary view
- [ ] Add UI for users to edit their own comments
- [ ] Add comment counts to version history sidebar, show only selected draft comments in history view
- [ ] Add 'X resolved' button in Review/My Drafts views, show resolved comments in Version History
- [ ] Add security headers and CSRF protection enhancements to Django settings
- [ ] Extend search to include draft content and comments, add highlighting in term list for prefix matches
- [ ] Add is_archived field to EntryDraft, create management command to archive unpublished drafts older than 1 month
- [ ] Implement inline diff view showing changes between current draft and more recent version
- [ ] Add @mention parsing in backend, create user autocomplete component with full-name search
- [ ] Create Reaction model, add thumbs up reaction endpoints and UI
- [ ] Create Notification model and API endpoints for in-app notifications
- [ ] Add notification generation triggers: draft edits, approvals, @mentions, review requests
- [ ] Create notifications panel component with unread count, dismiss functionality
