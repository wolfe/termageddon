# Complete Panel Unification: Fix Bugs and Strengthen Architecture (No Fallbacks)

## Problems Identified

### 1. Author Not Showing in My Drafts Published Version
**Location**: `draft-detail-panel.component.html` lines 222-232

**Root Cause**: The `ReviewDraft.replaces_draft` is typed as `EntryDraft` which should have a `author: User` field, but the backend may not be fully hydrating the nested author object when loading ReviewDrafts. Additionally, there's confusion between:
- The **main ReviewDraft** (which could be a published draft being compared)
- The **latest unpublished draft** (from draftHistory)
- The **published draft** (replaces_draft or found in draftHistory)

**Console errors expected**: 
```
Cannot read properties of undefined (reading 'first_name')
TypeError: Cannot read properties of undefined
```

### 2. Request Review Button Missing
**Location**: `draft-detail-panel.component.html` lines 35-43

**Root Cause**: Multiple possible issues:
- The `showRequestReviewButton` input might not be set correctly
- Conditional logic may be preventing display
- The method references might be incorrect

### 3. Requested and Approved Reviewers Not Showing
**Location**: `draft-detail-panel.component.html` lines 74-96

**Root Cause**: The component tries to show:
- Approvers from `getApprovers()` which returns `latestDraft?.approvers || draft?.approvers`
- Requested reviewers from `draft.requested_reviewers`

But there's confusion about which draft's metadata to display:
- The **header metadata** (lines 70-103) shows info about the main ReviewDraft
- The **Latest Draft section** (lines 143-174) tries to show the latest unpublished draft
- The **Published Version section** (lines 213-234) tries to show the published version

## Architectural Issues

The current implementation has architectural confusion:

1. **Multiple "Draft" Concepts**:
   - `draft: ReviewDraft` (input) - Could be ANY draft from the list
   - `latestDraft: EntryDraft` - The latest draft from draftHistory
   - `replaces_draft: EntryDraft` - A published draft that the main draft replaces
   - `selectedHistoricalDraft: EntryDraft` - User-selected historical draft

2. **Data Source Confusion**:
   - Which approvers to show? (main draft vs latest draft)
   - Which author to show? (main draft vs latest vs published)
   - Which requested_reviewers to show?

3. **Context Differences Not Managed**:
   - **Glossary**: Shows Entry with active_draft, not ReviewDraft
   - **Review**: Shows ReviewDraft (could be unpublished)
   - **My Drafts**: Shows ReviewDraft (latest per entry)

## Solution: Clarify Data Model and Flow

### Strategy

**Key Insight**: The three panels have fundamentally different data contexts that need to be explicitly managed:

1. **Glossary Context**: 
   - Data: `Entry` with `active_draft: EntryDraft`
   - Shows: The published/active version with edit capability
   - Metadata source: `active_draft` or `latestDraft` from history

2. **Review Context**:
   - Data: `ReviewDraft` (a draft pending approval/publication)
   - Shows: A specific draft that needs action
   - Metadata source: The ReviewDraft itself (main draft)
   - Additional data: `latestDraft` from history (might be newer than ReviewDraft)

3. **My Drafts Context**:
   - Data: `ReviewDraft` (latest draft per entry)
   - Shows: User's own drafts
   - Metadata source: The ReviewDraft itself
   - Additional data: Published version if exists

### Implementation Plan

## Phase 1: Fix Immediate Bugs

### 1.1 Fix Author Display in Published Version

**File**: `draft-detail-panel.component.html`

**Issue**: Lines 222-232 try to access `draft.replaces_draft.author` but it may be undefined.

**Fix**:
```typescript
// In draft-detail-panel.component.ts
getPublishedDraft(): EntryDraft | null {
  // First check if we have a published draft in our history
  const publishedInHistory = this.draftHistory.find(d => d.is_published);
  if (publishedInHistory) {
    return publishedInHistory;
  }
  
  // Use replaces_draft if available
  if (this.draft?.replaces_draft) {
    return this.draft.replaces_draft;
  }
  
  return null;
}

getPublishedDraftAuthor(): string {
  const published = this.getPublishedDraft();
  // Author should ALWAYS exist - if not, this is a backend bug that should be exposed
  return `${published!.author.first_name} ${published!.author.last_name}`;
}

getPublishedDraftTimestamp(): string {
  const published = this.getPublishedDraft();
  // Timestamp should ALWAYS exist - if not, this is a backend bug
  return published!.timestamp;
}
```

**Template change**: Use `getPublishedDraft()` method consistently.

### 1.2 Restore Request Review Button Visibility

**Files**: 
- `draft-detail-panel.component.html` lines 35-43
- `review-dashboard.component.html` line 93
- `my-drafts.component.html` line 78

**Issue**: The button should show but conditional logic or missing inputs prevent it.

**Fix**:
- Verify `showRequestReviewButton` is properly set in parent components
- Check if `requestReview` output is properly wired
- Ensure button isn't hidden by other conditions

**Debug approach**:
1. Add console.log to show input values
2. Verify the button visibility logic
3. Check parent component bindings

### 1.3 Fix Requested/Approved Reviewers Display

**File**: `draft-detail-panel.component.html` lines 74-96

**Issue**: Approvers and requested reviewers aren't showing.

**Root cause**: The component needs to clarify WHICH draft's metadata to show:
- Show the **main ReviewDraft's** approvers/requested_reviewers in the header
- Show the **latest draft's** approvers/requested_reviewers in the Latest Draft section

**Fix**:
```typescript
// In draft-detail-panel.component.ts

/**
 * Get approvers for the main draft (shown in header)
 */
getMainDraftApprovers(): User[] {
  return this.draft?.approvers || [];
}

/**
 * Get requested reviewers for the main draft (shown in header)
 */
getMainDraftRequestedReviewers(): User[] {
  return this.draft?.requested_reviewers || [];
}

/**
 * Get approvers for the latest draft (shown in Latest Draft section)
 */
getLatestDraftApprovers(): User[] {
  return this.latestDraft?.approvers || [];
}
```

**Template changes**:
- Header section: Use `getMainDraftApprovers()` and `getMainDraftRequestedReviewers()`
- Latest Draft section: Use `getLatestDraftApprovers()`

## Phase 2: Strengthen Component Architecture

### 2.1 Add Explicit Draft Context Type

**File**: `draft-detail-panel.component.ts`

**Goal**: Make it explicit which draft is being displayed and where data comes from.

```typescript
export type DraftDisplayContext = 'review' | 'my-drafts';

@Component({...})
export class DraftDetailPanelComponent {
  @Input() context: DraftDisplayContext = 'review';
  @Input() draft: ReviewDraft | null = null;
  
  // ... rest of component
  
  /**
   * Determine which draft's metadata to show in header
   * - Review context: Show the ReviewDraft metadata (it's the one being reviewed)
   * - My Drafts context: Show the ReviewDraft metadata (it's the latest draft)
   */
  getHeaderDraft(): ReviewDraft | null {
    return this.draft;
  }
  
  /**
   * Determine which draft's content to show in Latest Draft section
   * - Always show the latest from draftHistory if available
   * - Fall back to main draft
   */
  getLatestDraftContent(): string {
    if (this.latestDraft) {
      return this.latestDraft.content;
    }
    return this.draft?.content || '';
  }
}
```

### 2.2 Improve BaseEntryDetailComponent

**File**: `base-entry-detail.component.ts`

**Goal**: Add helper methods that child components can use consistently.

```typescript
export abstract class BaseEntryDetailComponent {
  // ... existing code ...
  
  /**
   * Get the draft to use for header metadata display
   */
  protected abstract getDisplayDraft(): Entry | ReviewDraft | null;
  
  /**
   * Get author name from a draft or entry - NO FALLBACKS
   * If author is missing, this will throw an error exposing the backend bug
   */
  protected getAuthorName(obj: any): string {
    if (!obj) {
      throw new Error('Object is null/undefined - this is a backend data issue');
    }
    
    // Handle Entry with active_draft
    if ('active_draft' in obj && obj.active_draft) {
      if (!obj.active_draft.author) {
        throw new Error('Entry.active_draft.author is missing - backend bug');
      }
      return this.getUserDisplayName(obj.active_draft.author);
    }
    
    // Handle ReviewDraft or EntryDraft with author
    if ('author' in obj) {
      if (!obj.author) {
        throw new Error('Draft.author is missing - backend bug');
      }
      return this.getUserDisplayName(obj.author);
    }
    
    throw new Error('Object has no author field - backend data structure issue');
  }
  
  /**
   * Get timestamp from a draft or entry - NO FALLBACKS
   * If timestamp is missing, this will throw an error exposing the backend bug
   */
  protected getTimestamp(obj: any): string {
    if (!obj) {
      throw new Error('Object is null/undefined - this is a backend data issue');
    }
    
    if ('active_draft' in obj && obj.active_draft) {
      if (!obj.active_draft.timestamp) {
        throw new Error('Entry.active_draft.timestamp is missing - backend bug');
      }
      return obj.active_draft.timestamp;
    }
    
    if ('timestamp' in obj) {
      if (!obj.timestamp) {
        throw new Error('Draft.timestamp is missing - backend bug');
      }
      return obj.timestamp;
    }
    
    throw new Error('Object has no timestamp field - backend data structure issue');
  }
}
```

### 2.3 Standardize Metadata Display Pattern

**Files**: 
- `draft-detail-panel.component.html`
- `term-detail.component.html`

**Goal**: Use consistent pattern for displaying author/timestamp across all sections.

**Pattern**:
```html
<!-- Header Metadata (Main Draft) -->
<div class="metadata">
  <span>Author: {{ getMainDraftAuthor() }}</span>
  <span>Created: {{ getMainDraftTimestamp() | date: "medium" }}</span>
</div>

<!-- Latest Draft Metadata -->
<div class="metadata">
  <span>Author: {{ getLatestDraftAuthor() }}</span>
  <span>Updated: {{ getLatestDraftTimestamp() | date: "medium" }}</span>
</div>

<!-- Published Version Metadata -->
<div class="metadata">
  <span>Author: {{ getPublishedDraftAuthor() }}</span>
  <span>Published: {{ getPublishedDraftTimestamp() | date: "medium" }}</span>
</div>
```

## Phase 3: Verify and Fix Backend Data Completeness

### 3.1 Verify Backend Serialization

**File**: `backend/glossary/serializers.py`

**Check**: Ensure that when serializing `ReviewDraft`, the nested `replaces_draft.author` is fully populated.

**What to verify**:
```python
class ReviewDraftSerializer(serializers.ModelSerializer):
    # ... existing fields ...
    replaces_draft = EntryDraftSerializer(read_only=True)  # Should include author
```

**If the issue exists**: The backend should be fixed to properly serialize the nested author object, not masked with frontend fallback logic. This ensures:
- Consistent data shape across all API responses
- Better performance (no extra client-side processing)
- Easier debugging (errors surface immediately)
- Proper type safety

**Approach**:
1. Check if `EntryDraftSerializer` includes the `author` field
2. Verify that `replaces_draft` is being serialized with depth=1 or explicit field inclusion
3. Test the API endpoint directly to see the response shape
4. If author is missing, update the serializer to include it

### 3.2 Ensure Backend Model Requirements

**File**: `backend/glossary/models.py`

**Check**: Ensure that the EntryDraft model has proper constraints:
```python
class EntryDraft(models.Model):
    # ... other fields ...
    author = models.ForeignKey(User, on_delete=models.CASCADE)  # Should be required
    timestamp = models.DateTimeField(auto_now_add=True)  # Should be required
```

**If missing**: Add proper model constraints to ensure data integrity at the database level.

## Phase 4: Manual Testing Protocol

### 4.1 Test Setup

**Test Data Requirements**:
1. A term "acid rock" with:
   - A published version (author: User A)
   - A latest unpublished draft (author: User B)
   - Requested reviewers: [User C, User D]
   - Approved by: [User E]

### 4.2 Test Cases

#### Test 1: My Drafts - Published Version Author Display
**Steps**:
1. Login as User B (who created the latest draft)
2. Navigate to "My Drafts"
3. Select "acid rock" from the list
4. Verify Latest Draft section shows: Author: User B
5. Verify Published Version section shows: Author: User A
6. Open browser console and check for errors

**Expected**: 
- ✅ "Author: User A" appears in Published Version
- ✅ "Published: [timestamp]" appears in Published Version
- ❌ No console errors

#### Test 2: My Drafts - Request Review Button
**Steps**:
1. Stay on "acid rock" in My Drafts
2. Look for "Request Reviewers" or "Request Additional Reviewers" button
3. Verify it's visible and clickable
4. Click the button
5. Verify reviewer selector dialog opens
6. Select reviewers and submit
7. Verify success notification

**Expected**:
- ✅ Button is visible in header
- ✅ Button text is appropriate ("Request Reviewers" or "Request Additional Reviewers")
- ✅ Dialog opens on click
- ✅ Can select and submit reviewers

#### Test 3: My Drafts - Requested and Approved Reviewers Display
**Steps**:
1. Stay on "acid rock" in My Drafts
2. Look at header metadata section (below the term name)
3. Verify "Approved by:" section shows avatars
4. Verify "Approval Requests:" section shows avatars

**Expected**:
- ✅ "Approved by: [User E avatar]" appears
- ✅ "Approval Requests: [User C avatar] [User D avatar]" appears

#### Test 4: Review - Request Review Button
**Steps**:
1. Login as User E (a reviewer)
2. Navigate to "Review"
3. Select a draft from the pending reviews list
4. Look for "Request Reviewers" or "Request Additional Reviewers" button
5. Verify it's visible

**Expected**:
- ✅ Button is visible
- ✅ Button is functional

#### Test 5: Review - Requested and Approved Reviewers Display
**Steps**:
1. Stay in Review view
2. Select "acid rock" if it appears in pending reviews
3. Look at header metadata
4. Verify approvers and requested reviewers display

**Expected**:
- ✅ Metadata displays correctly

### 4.3 Using Browser DevTools for Testing

**Steps to use Browser inspection tools**:
1. Open DevTools (F12 or Cmd+Option+I)
2. Go to Console tab to see errors
3. Go to Network tab to see API calls
4. Go to Elements tab to inspect DOM

**What to check**:
- Console errors mentioning "undefined" or "Cannot read properties"
- Network calls to `/api/drafts/` endpoints
- DOM structure showing buttons and metadata sections
- Angular component state using Angular DevTools extension

## Files to Modify

### Core Components
1. `frontend/src/app/components/shared/draft-detail-panel/draft-detail-panel.component.ts`
2. `frontend/src/app/components/shared/draft-detail-panel/draft-detail-panel.component.html`
3. `frontend/src/app/components/shared/base-entry-detail.component.ts`

### Parent Components
4. `frontend/src/app/components/review-dashboard/review-dashboard.component.html`
5. `frontend/src/app/components/my-drafts/my-drafts.component.html`

### Backend (if needed)
6. `backend/glossary/serializers.py`
7. `backend/glossary/models.py`

## Success Criteria

1. ✅ Author displays correctly in Published Version section in My Drafts
2. ✅ No console errors when viewing "acid rock" in My Drafts
3. ✅ Request Review button is visible and functional in Review and My Drafts
4. ✅ Requested reviewers display in header metadata
5. ✅ Approved reviewers display in header metadata
6. ✅ All metadata displays are consistent across contexts
7. ✅ Manual testing protocol completed successfully
8. ✅ Backend bugs are exposed rather than masked by frontend fallbacks

## Risk Mitigation

- Make changes incrementally, testing after each phase
- Keep backup of current state before changes
- Focus on Phase 1 (bug fixes) first before architectural improvements
- Use console.log strategically to debug data flow issues
- **NO FALLBACKS** - let backend bugs surface as errors

## Key Principles

1. **No Defensive Programming**: If data is missing, throw an error to expose the backend bug
2. **Explicit Data Sources**: Make it clear which draft's data is being displayed where
3. **Backend Responsibility**: Ensure backend provides complete, consistent data
4. **Frontend Clarity**: Frontend should fail fast when data is incomplete
5. **Type Safety**: Use TypeScript to catch data structure issues at compile time

## Implementation Checklist

- [ ] Fix author display in Published Version section by adding getPublishedDraft() and getPublishedDraftAuthor() methods
- [ ] Debug and restore Request Review button visibility in Review and My Drafts views
- [ ] Fix requested and approved reviewers display by adding separate methods for main draft vs latest draft metadata
- [ ] Add explicit DraftDisplayContext type and clarify which draft's data to show in each section
- [ ] Add helper methods to BaseEntryDetailComponent for author/timestamp extraction (with error throwing)
- [ ] Standardize metadata display pattern across all draft sections in templates
- [ ] Verify backend properly serializes nested replaces_draft.author in ReviewDraft
- [ ] Ensure backend model constraints require author and timestamp fields
- [ ] Execute manual testing protocol using browser tools to verify all fixes