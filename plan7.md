<!-- 5c5c0b92-02ef-4925-9590-6cd1b4350c32 3a2fe24f-115a-4246-87ed-7e7f767328d9 -->
# Fix Pending Reviews and Standardize UI

## Overview

Fix bugs in Pending Reviews filtering and create consistent right-hand side design between Review and My Drafts pages.

## Problem Analysis

### Bug: Pending Reviews Filtering

The "Show all drafts" checkbox on the Review page isn't working correctly. Looking at the code:

- Frontend calls `getDraftsCanApprove(showAll)` with `eligibility=requested_or_approved` parameter
- Backend filters by `show_all` but the filtering logic in `backend/glossary/views.py` lines 363-392 may not be working correctly with the `eligibility` parameter
- When unchecked: should show only drafts where user is a requested reviewer OR has already approved
- When checked: should show ALL unpublished drafts

### UI Inconsistency

The Review and My Drafts pages have different right-hand side layouts. Need to standardize to show:

1. Publish button at the top (when eligible)
2. The proposed Definition
3. The published version of the Definition (if exists) or indication it's a new entry
4. Comment section
5. Approval Requests list styled like the Glossary view (no names in common with "Approved By")

## Implementation Plan

### 1. Fix Backend Filtering Bug

**File**: `backend/glossary/views.py`

The issue is that the `eligibility` parameter handling is not implemented. The `show_all` parameter is being checked but the `eligibility` parameter is being ignored. Need to:

- Add handling for `eligibility` query parameter to properly filter drafts
- When `eligibility=requested_or_approved` and `show_all=false`: show only drafts where user is in `requested_reviewers` OR in `approvers`
- When `eligibility=requested_or_approved` and `show_all=true`: show all unpublished drafts
- Ensure the filtering doesn't conflict with existing author/search filters

### 2. Standardize Review Dashboard Right Side

**File**: `frontend/src/app/components/review-dashboard/review-dashboard.component.html`

Current layout (lines 164-441) needs to be reorganized to match requirements:

- Move Publish button to the top (currently scattered in multiple places)
- Restructure to show: Publish button → Definition → Replaces section → Comments → Approval Requests list
- Style "Approval Requests" (requested_reviewers) to match Glossary view (compact, dense)
- Ensure "Approved By" and "Approval Requests" have no names in common
- Remove the large author display, keep it minimal

### 3. Standardize My Drafts Right Side

**File**: `frontend/src/app/components/my-drafts/my-drafts.component.html`

Current layout (lines 106-260) needs matching changes:

- Publish button at top (currently at line 127-132)
- Same structure: Publish button → Definition → Replaces section → Comments → Approval Requests list
- Apply same compact styling for reviewer lists
- Ensure visual consistency with Review page

### 4. Add Comment Component to Review Dashboard

**File**: `frontend/src/app/components/review-dashboard/review-dashboard.component.ts`

Currently missing comment functionality. Add:

- Import `CommentThreadComponent` (already in My Drafts)
- Add comment loading logic similar to My Drafts (lines 120-136)
- Add comment state variables: `comments`, `isLoadingComments`
- Add comment event handlers: `onCommentAdded`, `onCommentResolved`, `onCommentUnresolved`

### 5. Update Tests

- Backend: Add unit tests for the new `eligibility` filtering logic
- Frontend: Update component tests to verify the new layout structure
- Run all existing tests to ensure no regressions

## Key Files to Modify

- `backend/glossary/views.py` - Fix filtering logic
- `frontend/src/app/components/review-dashboard/review-dashboard.component.html` - Standardize layout
- `frontend/src/app/components/review-dashboard/review-dashboard.component.ts` - Add comments functionality
- `frontend/src/app/components/my-drafts/my-drafts.component.html` - Standardize layout
- `backend/glossary/tests/test_views.py` - Add filtering tests

### To-dos

- [ ] Fix backend filtering logic to properly handle eligibility parameter and show_all checkbox
- [ ] Add comment functionality to Review Dashboard component (loading, display, handlers)
- [ ] Reorganize Review Dashboard right side to match requirements (Publish button at top, compact approval requests, comments section)
- [ ] Reorganize My Drafts right side to match Review Dashboard layout exactly
- [ ] Add backend unit tests for the new eligibility filtering logic
- [ ] Run all backend and frontend tests to ensure no regressions