<!-- 74b6574c-74ab-4731-a8e9-231a12e4772f 3b8ac567-5ac2-4338-854e-0090d005e822 -->
# Draft Deletion Workflow Plan

## Overview

Enable users to discard/delete their own unpublished drafts with a confirmation workflow. The deletion will be a soft delete (setting `is_deleted=True`) that cascades appropriately.

## Current State Analysis

**Backend:**

- `EntryDraft` model inherits from `AuditedModel` which provides soft delete via `delete()` method (sets `is_deleted=True`)
- `EntryDraftViewSet` currently excludes DELETE from `http_method_names` (line 456-463 in `views.py`)
- No authorization logic exists for draft deletion
- Comments on drafts use `on_delete=models.CASCADE`, so they will soft-delete when the draft is deleted

**Frontend:**

- No delete button or UI exists in draft detail panel or list items
- No delete method exists in services
- `my-drafts` component already has edit/publish workflows but no delete workflow

## Implementation Steps

### 1. Backend - Enable DELETE endpoint

**File: `backend/glossary/views.py`**

Add `"delete"` to `http_method_names` in `EntryDraftViewSet` (around line 456):

```python
http_method_names = [
    "get",
    "post",
    "patch",
    "put",
    "delete",  # ADD THIS
    "head",
    "options",
]
```

Add `destroy` method to `EntryDraftViewSet` (after line 675) with authorization:

```python
def destroy(self, request, *args, **kwargs):
    """Delete an unpublished draft (only by author)"""
    draft = self.get_object()
    
    # Only allow deleting unpublished drafts
    if draft.is_published:
        return Response(
            {"detail": "Cannot delete published drafts."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    # Only allow deleting own drafts
    if draft.author != request.user:
        return Response(
            {"detail": "You can only delete your own drafts."},
            status=status.HTTP_403_FORBIDDEN,
        )
    
    # Perform soft delete
    draft.delete()  # Uses soft delete from AuditedModel
    return Response(status=status.HTTP_204_NO_CONTENT)
```

### 2. Backend - Add unit tests

**File: `backend/glossary/tests/test_views.py`**

Add test cases covering:

- Successfully delete own unpublished draft
- Fail to delete another user's draft (403)
- Fail to delete published draft (400)
- Fail to delete non-existent draft (404)
- Verify comments are soft-deleted with draft

### 3. Frontend - Add delete method to service

**File: `frontend/src/app/services/glossary.service.ts`**

Add method to call DELETE endpoint:

```typescript
deleteDraft(draftId: number): Observable<void> {
  return this.http.delete<void>(`${this.apiUrl}/entry-drafts/${draftId}/`);
}
```

### 4. Frontend - Add confirmation dialog component

**File: `frontend/src/app/components/shared/confirm-dialog/confirm-dialog.component.ts`** (new)

Create reusable confirmation dialog component with:

- Title, message, confirm/cancel buttons
- Inputs: `@Input() title`, `@Input() message`, `@Input() confirmText`, `@Input() cancelText`
- Outputs: `@Output() confirmed`, `@Output() cancelled`

**User-facing text for discard confirmation:**

- Title: "Discard Draft?"
- Message: "Are you sure you want to discard this draft? This action cannot be undone."
- Confirm button: "Discard"
- Cancel button: "Cancel"

### 5. Frontend - Add discard button to draft detail panel

**File: `frontend/src/app/components/shared/draft-detail-panel/draft-detail-panel.component.ts`**

Add:

- `@Input() canDiscard: boolean = false`
- `@Output() discardRequested = new EventEmitter<void>()`
- Method: `onDiscard()` that emits `discardRequested`

**File: `frontend/src/app/components/shared/draft-detail-panel/draft-detail-panel.component.html`**

Add discard button after Edit button (around line 51):

```html
@if (canDiscard && !draft.is_published) {
  <button
    (click)="onDiscard()"
    class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
  >
    Discard Draft
  </button>
}
```

### 6. Frontend - Wire up discard workflow in My Drafts component

**File: `frontend/src/app/components/my-drafts/my-drafts.component.ts`**

Add:

- `showDiscardConfirmDialog: boolean = false`
- `draftToDiscard: ReviewDraft | null = null`
- Method: `onDiscardRequested()` - shows confirmation dialog
- Method: `confirmDiscard()` - calls service.deleteDraft() and updates UI
- Method: `cancelDiscard()` - closes dialog

**File: `frontend/src/app/components/my-drafts/my-drafts.component.html`**

- Pass `[canDiscard]="true"` to `<app-draft-detail-panel>` (around line 107)
- Add `(discardRequested)="onDiscardRequested()"` event handler
- Add `<app-confirm-dialog>` after the reviewer selector dialog (around line 137) with user-facing discard text

### 7. Frontend - Update panel after deletion

**File: `frontend/src/app/services/panel-common.service.ts`**

Add method `refreshAfterDelete()` similar to `refreshAfterApproval()` that:

- Removes deleted draft from lists
- Clears selection
- Navigates to `/my-drafts` without query params

## Testing Checklist

**Backend Tests:**

- ✓ Author can delete own unpublished draft
- ✓ Non-author cannot delete draft (403)
- ✓ Cannot delete published draft (400)
- ✓ Draft is soft-deleted (is_deleted=True)
- ✓ Comments are soft-deleted with draft

**Frontend Manual Tests:**

- ✓ Delete button appears only in My Drafts panel
- ✓ Delete button not shown for published drafts
- ✓ Confirmation dialog appears when clicking delete
- ✓ Canceling confirmation closes dialog without deleting
- ✓ Confirming deletion removes draft from list
- ✓ After deletion, detail panel shows empty state
- ✓ URL updates to remove draftId query param
- ✓ **CRITICAL: Multiple unpublished drafts scenario - after deleting latest draft, previous draft appears in list**

## Edge Cases

- User tries to delete while viewing in edit mode → Cancel edit first
- User deletes draft while others are reviewing → Comments soft-deleted, reviewers lose access
- User deletes the only draft for an entry → Entry remains but has no active draft
- Network error during deletion → Show error message, don't update UI
- **User has multiple unpublished drafts for same entry** → After deleting latest, previous draft should appear in list

## Important Behavior: Draft Versioning

The "My Drafts" view uses `eligibility=own` which filters to show only the **latest unpublished draft per entry** per user (see `views.py` lines 524-542). This means:

1. If Alice creates draft v1 (unpublished), then draft v2 (unpublished), only v2 appears in her list
2. When Alice deletes v2, the backend query will automatically return v1 as the new "latest"
3. After deletion, we should reload the draft list to show v1
4. If Alice deletes v1 (now the only draft), the entry disappears from her "My Drafts" list

**Critical Test Case:** Create 3 unpublished drafts for the same entry (edit → save → edit → save → edit → save), delete the latest (3rd), verify the 2nd draft appears in list, delete it, verify the 1st draft appears, delete it, verify the entry disappears from the list entirely.

### To-dos

- [ ] Add DELETE to http_method_names and implement destroy method in EntryDraftViewSet with authorization
- [ ] Add comprehensive unit tests for draft deletion API endpoint
- [ ] Add deleteDraft method to GlossaryService
- [ ] Create reusable ConfirmDialogComponent for deletion confirmation
- [ ] Add delete button and event emitter to DraftDetailPanelComponent
- [ ] Wire up delete workflow in MyDraftsComponent with confirmation dialog
- [ ] Add refreshAfterDelete method to PanelCommonService
- [ ] Manual testing of complete delete workflow end-to-end