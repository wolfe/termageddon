<!-- 8ecb7aeb-2ced-4b4d-91f6-9d23b92465d2 c8da4e3a-b415-4409-a6ad-27795d01c429 -->
# Create Entry Enhancement with URL Routing

## Phase 1: Implement URL Routing Structure

### 1.1 Update Route Definitions

**File:** `frontend/src/app/app.routes.ts`

Add shareable routes with smart panel routing:

- `/entry/:entryId` - View entry (routes to Glossary if published, or appropriate draft panel if unpublished)
  - Optional query params: `?term=api&perspective=technology` (human-readable, ignored by router)
- `/entry/:entryId/edit` - Edit entry (creates draft or continues editing existing draft)
  - Optional query params: `?term=api&perspective=technology`
- `/draft/:draftId` - View draft (routes to My Drafts if author, Review if reviewer, Glossary if published)
  - Optional query params: `?term=api&perspective=technology`

**Example URLs:**

- Full: `/entry/42?term=api&perspective=technology`
- Short: `/entry/42`
- Draft: `/draft/123?term=api&perspective=finance`

The existing panel routes remain for direct navigation:

- `/glossary` - Glossary panel (no specific entry selected)
- `/review` - Review panel (no specific draft selected)
- `/my-drafts` - My Drafts panel (no specific draft selected)

### 1.2 Create Smart Routing Components

**Files:**

- `frontend/src/app/components/entry-router/entry-router.component.ts`
- `frontend/src/app/components/draft-router/draft-router.component.ts`

These components handle the routing logic:

- Read entryId/draftId from route params
- Fetch entry/draft data from backend
- Determine appropriate panel based on user and content state
- Redirect to correct panel with content selected
- Preserve query parameters when generating URLs

### 1.3 Update GlossaryViewComponent for Route Parameters

**File:** `frontend/src/app/components/glossary-view/glossary-view.component.ts`

- Inject `ActivatedRoute` and `Router`
- Subscribe to route params in `ngOnInit`
- Load entry by ID from route param if present
- Update URL when entry is selected (using `Location.replaceState()` to avoid navigation)
- Handle edit mode from route
- Generate URLs with query params when sharing

### 1.4 Update ReviewDashboardComponent for Route Parameters

**File:** `frontend/src/app/components/review-dashboard/review-dashboard.component.ts`

- Inject `ActivatedRoute` and `Router`
- Subscribe to route params for draft ID
- Load and select draft by ID from route param
- Update URL when draft is selected
- Generate URLs with query params when sharing

### 1.5 Update MyDraftsComponent for Route Parameters

**File:** `frontend/src/app/components/my-drafts/my-drafts.component.ts`

- Inject `ActivatedRoute` and `Router`
- Subscribe to route params for draft ID
- Load and select draft by ID from route param
- Update URL when draft is selected
- Generate URLs with query params when sharing

## Phase 2: Backend API Enhancements

### 2.1 Create Entry Lookup Endpoint

**File:** `backend/glossary/views.py`

Add custom action to `EntryViewSet`:

```python
@action(detail=False, methods=['post'])
def lookup_or_create_entry(self, request):
    """
    Look up or create an entry for term+perspective.
    Returns: {
        'entry_id': int or None,
        'has_published_draft': bool,
        'has_unpublished_draft': bool,
        'unpublished_draft_author_id': int or None,
        'is_new': bool,
        'term': {...},
        'perspective': {...},
        'entry': {...} or None
    }
    """
```

This endpoint will:

- Accept `term_id` or `term_text`, and `perspective_id`
- Check if term exists (by ID or text)
- Check if entry exists for term+perspective
- Check draft status if entry exists
- Return comprehensive state information

### 2.2 Add Entry Detail Endpoint with Draft Info

**File:** `backend/glossary/views.py`

Enhance `EntryViewSet.retrieve()` to include:

- All draft information (published and unpublished)
- Author information for unpublished drafts
- This allows router components to determine correct panel

### 2.3 Add Draft Detail Endpoint with Entry Info

**File:** `backend/glossary/views.py`

Ensure `EntryDraftViewSet.retrieve()` returns:

- Full entry details including term and perspective
- Draft status and author information
- This allows router to determine if draft is published/unpublished

### 2.4 Get All Terms Endpoint Enhancement

**File:** `backend/glossary/views.py`

Ensure `TermViewSet` has a simple list endpoint that returns all terms (for autocomplete), possibly with entry counts per perspective.

## Phase 3: Frontend Service Updates

### 3.1 Add GlossaryService Methods

**File:** `frontend/src/app/services/glossary.service.ts`

Add methods:

- `lookupOrCreateEntry(termId: number | null, termText: string, perspectiveId: number)` - calls new backend endpoint
- `getEntryById(entryId: number)` - fetches single entry by ID with full draft info
- `getDraftById(draftId: number)` - fetches single draft by ID with full entry info
- `getAllTerms()` - fetches all terms for autocomplete

### 3.2 Update Models

**File:** `frontend/src/app/models/index.ts`

Add new interfaces:

```typescript
export interface EntryLookupResponse {
  entry_id: number | null;
  has_published_draft: boolean;
  has_unpublished_draft: boolean;
  unpublished_draft_author_id: number | null;
  is_new: boolean;
  term: Term;
  perspective: Perspective;
  entry?: Entry;
}

export interface CreateEntryRequest {
  term_id?: number;
  term_text?: string;
  perspective_id: number;
  is_official?: boolean;
}
```

### 3.3 Create URL Helper Service

**File:** `frontend/src/app/services/url-helper.service.ts`

New service for URL generation:

- `buildEntryUrl(entryId: number, entry?: Entry, includeQueryParams?: boolean)` - builds `/entry/:id?term=...&perspective=...`
- `buildDraftUrl(draftId: number, draft?: ReviewDraft, includeQueryParams?: boolean)` - builds `/draft/:id?term=...&perspective=...`
- `normalizeTermForUrl(termText: string)` - converts term to URL-safe format
- `normalizePerspectiveForUrl(perspectiveName: string)` - converts perspective to URL-safe format

## Phase 4: Enhanced Create Entry Dialog

### 4.1 Rename and Enhance TermDialogComponent

**File:** `frontend/src/app/components/term-dialog/term-dialog.component.ts`

Rename to `CreateEntryDialogComponent` and add:

- Term selection/creation (autocomplete with existing terms + "Create new" option)
- Perspective selector with indicators showing:
  - ✓ Published entry exists
  - 📝 Draft in progress (with author indicator if different from current user)
  - (empty) No entry yet
- Smart button behavior based on state
- Navigation logic after creation using new URL structure

**Button text logic:**

- New entry → "Create Entry" (navigates to `/entry/:entryId/edit`)
- Existing with no draft → "Edit Entry" (navigates to appropriate panel with edit mode)
- Existing with own draft → "Continue Editing" (navigates to `/draft/:draftId`)
- Existing with others' draft → "View Entry" (navigates to `/entry/:entryId`)
- Published only → "Create New Draft" (navigates to edit mode)

### 4.2 Create Autocomplete Component

**File:** `frontend/src/app/components/shared/term-autocomplete/term-autocomplete.component.ts`

New component for term selection:

- Input field with dropdown
- Filters existing terms as user types
- Shows "Create new term: [text]" option at bottom
- Emits selected term ID or new term text

### 4.3 Update TermListComponent

**File:** `frontend/src/app/components/term-list/term-list.component.ts`

- Change button text from "+ Create Term" to "+ Create Entry"
- Update dialog reference to new `CreateEntryDialogComponent`
- Handle navigation after entry creation

### 4.4 Update Perspective Selector UI

**File:** `frontend/src/app/components/term-dialog/term-dialog.component.html`

Enhance perspective dropdown to show:

- Perspective name
- Status indicator icon/badge
- Tooltip with detailed status

## Phase 5: Navigation Logic

### 5.1 Create NavigationService

**File:** `frontend/src/app/services/navigation.service.ts`

New service to centralize navigation logic:

- `navigateToEntry(entryId: number, entry?: Entry, editMode?: boolean)` - Navigate using `/entry/:id` route
- `navigateToDraft(draftId: number, draft?: ReviewDraft)` - Navigate using `/draft/:id` route
- `determineTargetPanel(entry: Entry, currentUser: User)` - Determine which panel to show entry in
- `determineDraftPanel(draft: ReviewDraft, currentUser: User)` - Determine which panel to show draft in

Logic for determining panel:

- Entry with published draft only → Glossary
- Entry with unpublished draft by current user → My Drafts
- Entry with unpublished draft by others → Review (if user can approve) or Glossary
- Draft by current user → My Drafts
- Draft by others, not published → Review
- Draft published → Glossary

## Phase 6: Testing

### 6.1 Backend Tests

**File:** `backend/glossary/tests/test_views.py`

Add tests for:

- `lookup_or_create_entry` endpoint with various scenarios
- Entry retrieve with full draft information
- Draft retrieve with full entry information

### 6.2 Frontend Tests

Update component tests for:

- Route parameter handling in all three panel components
- Entry/Draft router components redirect logic
- CreateEntryDialogComponent term selection and perspective states
- Navigation service logic
- URL helper service query parameter generation

## Implementation Notes

- Use `Location.replaceState()` for updating URL without navigation when selecting entries in lists
- Query parameters are optional and purely for human readability - all routing decisions based on IDs
- Consider caching term list for autocomplete performance
- Ensure all navigation maintains proper browser history for back button
- Add loading states during entry lookup/creation
- Handle edge cases: deleted entries, permissions, concurrent edits
- When generating shareable URLs, default to including query parameters for better UX

### To-dos

- [ ] Create entry-router and draft-router components for smart routing
- [ ] Update app.routes.ts with entry and draft routes
- [ ] Add route parameter handling to GlossaryViewComponent
- [ ] Add route parameter handling to ReviewDashboardComponent
- [ ] Add route parameter handling to MyDraftsComponent
- [ ] Create lookup_or_create_entry backend endpoint
- [ ] Enhance entry retrieve endpoint with draft info
- [ ] Enhance draft retrieve endpoint with entry info
- [ ] Add backend tests for new endpoints
- [ ] Add lookupOrCreateEntry, getEntryById, getDraftById, getAllTerms to GlossaryService
- [ ] Add EntryLookupResponse and CreateEntryRequest interfaces
- [ ] Create URL helper service for query parameter generation
- [ ] Create term-autocomplete component for term selection
- [ ] Rename TermDialogComponent to CreateEntryDialogComponent
- [ ] Enhance dialog with term autocomplete and perspective status indicators
- [ ] Create NavigationService for centralized navigation logic
- [ ] Implement smart navigation logic in CreateEntryDialogComponent
- [ ] Update TermListComponent button text and behavior
- [ ] Update frontend component tests for routing and navigation
- [ ] Update app.routes.ts with entry and draft ID parameters
- [ ] Add route parameter handling to GlossaryViewComponent
- [ ] Add route parameter handling to ReviewDashboardComponent
- [ ] Add route parameter handling to MyDraftsComponent
- [ ] Create lookup_or_create_entry backend endpoint
- [ ] Add backend tests for new endpoint
- [ ] Add lookupOrCreateEntry, getEntryById, getAllTerms to GlossaryService
- [ ] Add EntryLookupResponse and CreateEntryRequest interfaces
- [ ] Create term-autocomplete component for term selection
- [ ] Rename TermDialogComponent to CreateEntryDialogComponent
- [ ] Enhance dialog with term autocomplete and perspective status indicators
- [ ] Create NavigationService for centralized navigation logic
- [ ] Implement smart navigation logic in CreateEntryDialogComponent
- [ ] Update TermListComponent button text and behavior
- [ ] Update frontend component tests for routing and navigation