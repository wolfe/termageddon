---
name: ""
overview: ""
todos: []
---

# Fix Infinite Scroll Scrollbar Size - Centralized Solution

## Problem Statement

The infinite scroll implementations across the application cause the scrollbar size to change as more pages are loaded. Since the API returns a `count` field indicating the total number of items, we can calculate the total scroll height upfront and keep the scrollbar size constant.

## Current State Analysis

### Infinite Scroll Use Cases

1. **TermListComponent** (Glossary view)

      - Location: `frontend/src/app/components/term-list/term-list.component.ts`
      - Data type: `GroupedEntry[]` (terms with entries)
      - API: `getEntriesGroupedByTerm()` → `PaginatedResponse<GroupedEntry>`
      - Item component: Inline term boxes (term name + perspective pills)
      - Min-height: ~60-80px (varies with perspective pill wrapping)
      - Current: Uses infinite scroll with `@HostListener('window:scroll')`

2. **ReviewDashboardComponent** (Review view)

      - Location: `frontend/src/app/components/review-dashboard/review-dashboard.component.ts`
      - Data type: `ReviewDraft[]`
      - API: `unifiedDraftService.loadDrafts()` → `PaginatedResponse<ReviewDraft>`
      - Item component: `DraftListItemComponent`
      - Min-height: ~100-120px (term + perspective + author circles + date + publish button)
      - Current: **Loads all drafts at once** (no infinite scroll currently)

3. **MyDraftsComponent** (My Drafts view)

      - Location: `frontend/src/app/components/my-drafts/my-drafts.component.ts`
      - Data type: `ReviewDraft[]`
      - API: `unifiedDraftService.loadDrafts()` → `PaginatedResponse<ReviewDraft>`
      - Item component: `DraftListItemComponent`
      - Min-height: ~100-120px (same as Review)
      - Current: **Loads all drafts at once** (no infinite scroll currently)

4. **EntryLinkSelectorDialogComponent** (Dialog)

      - Location: `frontend/src/app/components/shared/entry-link-selector-dialog/entry-link-selector-dialog.component.ts`
      - Data type: `GroupedEntry[]`
      - API: `getEntriesGroupedByTerm()` → `PaginatedResponse<GroupedEntry>`
      - Item component: Inline entry boxes
      - Min-height: ~60-80px (similar to Glossary)
      - Current: Uses infinite scroll with `(scroll)` event handler

5. **VersionHistorySidebarComponent** (Sidebar)

      - Location: `frontend/src/app/components/shared/version-history-sidebar/version-history-sidebar.component.ts`
      - Data type: `EntryDraft[]`
      - API: `getDraftHistory()` → `PaginatedResponse<EntryDraft>`
      - Item component: Inline draft items
      - Min-height: ~60-80px
      - Current: Uses infinite scroll with `(scroll)` event handler

### Existing Shared Infrastructure

- **PanelCommonService**: Centralized logic for Review and MyDrafts views
    - Location: `frontend/src/app/services/panel-common.service.ts`
    - Handles: draft loading, selection, comments, reviewer selection, publishing, approval
    - Uses: `UnifiedDraftService` for API calls
    - State: `PanelState` interface

- **UnifiedDraftService**: Unified API service for draft operations
    - Location: `frontend/src/app/services/unified-draft.service.ts`
    - Returns: `PaginatedResponse<ReviewDraft>`
    - Note: Currently loads all results (no pagination support in service)

- **Common Scroll Pattern**: All infinite scroll implementations use:
  ```typescript
 - hasNextPage: boolean
 - isLoadingMore / loadingMore: boolean
 - onScroll() method with 200px threshold
 - loadMore*() method
  ```


## Research: Is This Pattern Common?

### Findings

**Angular CDK Virtual Scrolling** (`@angular/cdk/scrolling`):

- **What it does**: Renders only visible items in the viewport for performance
- **Scrollbar behavior**: Requires fixed item heights OR total height calculation
- **Our use case**: We have variable item heights (wrapping pills, variable badges)
- **Verdict**: Not ideal - designed for fixed-height items or requires significant adaptation

**Common Infinite Scroll Libraries**:

- `ngx-infinite-scroll`: Basic infinite scroll, doesn't handle fixed scrollbar size
- `ngx-virtual-scroller`: Virtual scrolling, requires fixed heights
- Most libraries: Focus on performance (virtual scrolling) or simplicity (basic infinite scroll), not fixed scrollbar UX

**Industry Pattern Analysis**:

- **Most common approach**: Accept changing scrollbar size (Twitter, Facebook, Instagram)
- **Alternative 1**: Hide scrollbar entirely (many mobile-first designs)
- **Alternative 2**: Use "Load More" button instead of infinite scroll
- **Alternative 3**: Virtual scrolling with fixed item heights (Angular CDK)
- **Our pattern**: Fixed scrollbar with variable heights using spacer - **Less common, but valid UX pattern**

### Assessment

**Is this pattern common?**

- **No** - Most infinite scroll implementations accept changing scrollbar size
- The spacer approach is a valid UX pattern but not widely implemented in libraries
- This appears to be a custom solution for a specific UX requirement

**Should we use a library?**

- **Probably not** - No library specifically handles this pattern
- Angular CDK virtual scrolling could work but requires:
    - Fixed item heights (we have variable)
    - Significant refactoring
    - May not provide the exact UX we want

**Recommendation**:

- **Option A**: Proceed with custom implementation (spacer approach) - reasonable for this specific UX need
- **Option B**: Reconsider if fixed scrollbar is essential - most users are accustomed to changing scrollbars
- **Option C**: Use Angular CDK virtual scrolling with fixed min-heights - more standard but requires more work

## Architectural Decisions

### Decision 1: Create InfiniteScrollService

**Decision**: Create a centralized `InfiniteScrollService` to handle:

- Scroll detection logic
- Pagination state management
- Total count tracking
- Height calculation
- Scrollbar size management

**Rationale**:

- Eliminates code duplication across 5 components
- Centralizes scroll threshold logic (currently 200px everywhere)
- Makes it easier to add features like virtual scrolling later
- Allows consistent behavior across all infinite scroll implementations

### Decision 2: Create InfiniteScrollDirective

**Decision**: Create an Angular directive `[appInfiniteScroll]` that:

- Handles scroll event binding
- Manages scroll container reference
- Integrates with `InfiniteScrollService`
- Provides configurable options (threshold, min-height, etc.)

**Rationale**:

- Declarative approach fits Angular patterns
- Reduces boilerplate in components
- Makes scroll behavior reusable and testable
- Can be applied to any scrollable container

### Decision 3: Extend PanelState for Infinite Scroll

**Decision**: Add infinite scroll state to `PanelState` interface:

```typescript
interface PanelState {
  // ... existing fields ...
  // Infinite scroll state
  totalCount: number | null;
  currentPage: number;
  hasNextPage: boolean;
  isLoadingMore: boolean;
  scrollContainerHeight: number | null;
}
```

**Rationale**:

- Review and MyDrafts already use `PanelState`
- Keeps state management consistent
- Allows `PanelCommonService` to handle infinite scroll for these views

### Decision 4: Add Pagination Support to UnifiedDraftService

**Decision**: Extend `UnifiedDraftService.loadDrafts()` to support pagination:

- Add `page?: number` parameter to `DraftLoadOptions`
- Return full `PaginatedResponse` (already does, but ensure `count` is included)
- Update Review and MyDrafts to use infinite scroll instead of loading all

**Rationale**:

- Enables infinite scroll for Review and MyDrafts
- Consistent with other paginated endpoints
- Better performance for large datasets
- Matches user's expectation that these views should also use infinite scroll

### Decision 5: Item Height Configuration

**Decision**: Create a configuration object for item heights:

```typescript
interface ScrollHeightConfig {
  itemMinHeight: number;  // Minimum height per item
  itemPadding: number;    // Padding/margins per item
  headerHeight?: number;   // Fixed header height (if applicable)
  footerHeight?: number;  // Fixed footer height (if applicable)
}
```

**Rationale**:

- Different views have different item heights
- Allows precise calculation of total scroll height
- Makes it easy to adjust heights without code changes
- Supports future responsive design needs

### Decision 6: Height Calculation Strategy

**Decision**: Use **Option C - Spacer Element** approach:

- Add a spacer `<div>` at the end of the scrollable list
- Calculate spacer height: `(totalCount - loadedCount) * itemMinHeight`
- Set spacer height dynamically via `[style.height.px]`
- Keep existing scroll container as-is (no min-height manipulation)

**Rationale**:

- Least invasive to existing layout
- Works with flexbox layouts (no min-height conflicts)
- Easy to implement and debug
- Maintains scroll position naturally
- Can be easily removed if count changes (filters applied)

### Decision 7: Min-Height Values

**Decision**: Define min-heights based on view type:

- **Glossary/EntryLinkSelector**: 70px (term name + 1-2 perspective pills)
- **Review/MyDrafts**: 110px (term + perspective + author circles + date + button)
- **VersionHistory**: 70px (draft info + metadata)

**Rationale**:

- Based on visual inspection of images provided
- Accounts for variable content (wrapping pills, variable badge counts)
- Conservative estimates ensure scrollbar doesn't shrink unexpectedly
- Can be fine-tuned after implementation

## Implementation Plan

### Phase 1: Create Core Infrastructure

#### 1.1 Create InfiniteScrollService

**File**: `frontend/src/app/services/infinite-scroll.service.ts`

**Responsibilities**:

- Track pagination state (currentPage, hasNextPage, totalCount)
- Calculate total scroll height based on count and config
- Provide methods: `initialize()`, `onPageLoaded()`, `reset()`, `getSpacerHeight()`

**Interface**:

```typescript
interface InfiniteScrollState {
  totalCount: number | null;
  loadedCount: number;
  currentPage: number;
  hasNextPage: boolean;
  isLoadingMore: boolean;
}

interface InfiniteScrollConfig {
  itemMinHeight: number;
  itemPadding: number;
  headerHeight?: number;
  footerHeight?: number;
  scrollThreshold?: number; // Default: 200px
}
```

#### 1.2 Create InfiniteScrollDirective

**File**: `frontend/src/app/directives/infinite-scroll.directive.ts`

**Responsibilities**:

- Bind to scroll events on host element
- Detect when user scrolls near bottom (threshold)
- Emit event to trigger `loadMore()`
- Integrate with `InfiniteScrollService` for state management

**Usage**:

```html
<div
  appInfiniteScroll
  [scrollConfig]="scrollConfig"
  (loadMore)="loadMoreItems()"
  [disabled]="!hasNextPage || isLoadingMore"
>
```

#### 1.3 Extend PanelState Interface

**File**: `frontend/src/app/services/panel-common.service.ts`

**Changes**:

- Add infinite scroll fields to `PanelState`
- Update `initializePanelState()` to include scroll state
- Add methods to `PanelCommonService` for scroll management

### Phase 2: Update Services

#### 2.1 Extend UnifiedDraftService

**File**: `frontend/src/app/services/unified-draft.service.ts`

**Changes**:

- Add `page?: number` to `DraftLoadOptions`
- Ensure all methods return `PaginatedResponse` with `count`
- Update `loadDrafts()` to pass page parameter to underlying services

#### 2.2 Verify API Responses Include Count

**Files**:

- `backend/glossary/views.py` (grouped_by_term, history endpoints)
- `frontend/src/app/services/glossary.service.ts`

**Changes**:

- Verify `PageNumberPagination` returns `count` (it should)
- Ensure frontend properly extracts and uses `count` field

### Phase 3: Update Components

#### 3.1 Update TermListComponent (Glossary)

**File**: `frontend/src/app/components/term-list/term-list.component.ts`

**Changes**:

- Replace `@HostListener` with `InfiniteScrollDirective`
- Use `InfiniteScrollService` for state management
- Store `totalCount` from API response
- Add spacer element in template
- Calculate and set spacer height

**Config**:

```typescript
scrollConfig = {
  itemMinHeight: 70,
  itemPadding: 12, // p-3 = 12px
  scrollThreshold: 200
}
```

#### 3.2 Update ReviewDashboardComponent

**File**: `frontend/src/app/components/review-dashboard/review-dashboard.component.ts`

**Changes**:

- Switch from loading all drafts to infinite scroll
- Use `PanelCommonService` for scroll state (extends `PanelState`)
- Update `loadPendingDrafts()` to support pagination
- Add infinite scroll directive to template
- Add spacer element

**Config**:

```typescript
scrollConfig = {
  itemMinHeight: 110,
  itemPadding: 12,
  scrollThreshold: 200
}
```

#### 3.3 Update MyDraftsComponent

**File**: `frontend/src/app/components/my-drafts/my-drafts.component.ts`

**Changes**:

- Switch from loading all drafts to infinite scroll
- Use `PanelCommonService` for scroll state
- Update `loadMyDrafts()` to support pagination
- Add infinite scroll directive to template
- Add spacer element

**Config**: Same as Review (110px min-height)

#### 3.4 Update EntryLinkSelectorDialogComponent

**File**: `frontend/src/app/components/shared/entry-link-selector-dialog/entry-link-selector-dialog.component.ts`

**Changes**:

- Replace manual scroll handler with `InfiniteScrollDirective`
- Use `InfiniteScrollService` for state
- Add spacer element

**Config**: Same as Glossary (70px min-height)

#### 3.5 Update VersionHistorySidebarComponent

**File**: `frontend/src/app/components/shared/version-history-sidebar/version-history-sidebar.component.ts`

**Changes**:

- Replace manual scroll handler with `InfiniteScrollDirective`
- Use `InfiniteScrollService` for state
- Add spacer element

**Config**:

```typescript
scrollConfig = {
  itemMinHeight: 70,
  itemPadding: 8,
  scrollThreshold: 200
}
```

### Phase 4: Template Updates

#### 4.1 Add Spacer Elements

**Pattern for all components**:

```html
<!-- Existing list items -->
@for (item of items; track item.id) {
  <!-- item template -->
}

<!-- Spacer for unloaded items -->
@if (totalCount && totalCount > loadedCount) {
  <div
    class="infinite-scroll-spacer"
    [style.height.px]="getSpacerHeight()"
    aria-hidden="true"
  ></div>
}
```

#### 4.2 Add InfiniteScrollDirective

**Pattern**:

```html
<div
  #scrollContainer
  class="flex-1 overflow-y-auto min-h-0"
  appInfiniteScroll
  [scrollConfig]="scrollConfig"
  (loadMore)="loadMoreItems()"
  [disabled]="!hasNextPage || isLoadingMore"
>
  <!-- content -->
</div>
```

### Phase 5: Styling

#### 5.1 Add Spacer Styles

**File**: `frontend/src/app/styles/shared-components.scss` or new file

```scss
.infinite-scroll-spacer {
  // Invisible spacer, no content
  pointer-events: none;
  user-select: none;
}
```

## Files to Create

1. `frontend/src/app/services/infinite-scroll.service.ts` - Core scroll logic
2. `frontend/src/app/directives/infinite-scroll.directive.ts` - Scroll directive
3. `frontend/src/app/directives/infinite-scroll.directive.spec.ts` - Tests

## Files to Modify

1. `frontend/src/app/services/panel-common.service.ts` - Add scroll state
2. `frontend/src/app/services/unified-draft.service.ts` - Add pagination support
3. `frontend/src/app/components/term-list/term-list.component.ts` - Use directive
4. `frontend/src/app/components/term-list/term-list.component.html` - Add spacer
5. `frontend/src/app/components/review-dashboard/review-dashboard.component.ts` - Add infinite scroll
6. `frontend/src/app/components/review-dashboard/review-dashboard.component.html` - Add directive & spacer
7. `frontend/src/app/components/my-drafts/my-drafts.component.ts` - Add infinite scroll
8. `frontend/src/app/components/my-drafts/my-drafts.component.html` - Add directive & spacer
9. `frontend/src/app/components/shared/entry-link-selector-dialog/entry-link-selector-dialog.component.ts` - Use directive
10. `frontend/src/app/components/shared/entry-link-selector-dialog/entry-link-selector-dialog.component.html` - Add spacer
11. `frontend/src/app/components/shared/version-history-sidebar/version-history-sidebar.component.ts` - Use directive
12. `frontend/src/app/components/shared/version-history-sidebar/version-history-sidebar.component.html` - Add spacer
13. `frontend/src/app/styles/shared-components.scss` - Add spacer styles

## Testing Considerations

- Test scrollbar size remains constant as pages load
- Test scrollbar updates correctly when filters change (count changes)
- Test with empty results (no spacer)
- Test with results that fit in one page (no spacer needed)
- Test scroll position preservation when loading more
- Test disabled state (no more pages)
- Test error handling (failed loads)

## Migration Notes

- Review and MyDrafts currently load all drafts - this is a behavior change
- May need to update tests that expect all drafts to be loaded
- Consider adding a "Load All" option if needed for specific use cases
- Monitor performance impact of pagination vs. loading all

## Alternative Approaches Considered

### Option A: Accept Changing Scrollbar (Status Quo)

**Pros**: No implementation needed, standard behavior users expect

**Cons**: Scrollbar size changes can be jarring, less precise navigation

### Option B: Use Angular CDK Virtual Scrolling

**Pros**: Industry-standard, well-tested, performance optimized

**Cons**: Requires fixed item heights (we have variable), significant refactoring needed

### Option C: Use "Load More" Button Instead

**Pros**: Simple, no scrollbar issues, user has control

**Cons**: Less smooth UX, requires extra click, not infinite scroll

### Option D: Custom Spacer Implementation (Chosen)

**Pros**: Solves exact UX need, works with variable heights, minimal refactoring

**Cons**: Custom code to maintain, less common pattern

## Recommendation

Given that:

1. This pattern is not commonly implemented in libraries
2. Angular CDK virtual scrolling doesn't fit our variable-height use case well
3. The spacer approach is straightforward and solves the specific UX need
4. We already have the `count` from the API

**Recommendation**: Proceed with custom implementation using the spacer approach. It's a reasonable solution for this specific UX requirement, even if not a common library pattern. The code will be centralized and maintainable.

**Alternative**: If the UX benefit is questionable, consider keeping the current behavior (changing scrollbar) which is what most users expect from infinite scroll implementations.
