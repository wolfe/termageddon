<!-- e253058a-2f48-4267-be0e-704c62776bf7 7ce6ecc0-adbb-40f6-9dcf-6ed35a95ca06 -->
# Further Panel Unification Opportunities

## Analysis Summary

The three panels have already achieved significant unification through:

- Shared layout component (`MasterDetailLayoutComponent`)
- Centralized state management (`PanelCommonService` with `PanelState`)
- Reusable components (`SearchFilterBarComponent`, `DraftListItemComponent`, `DraftDetailPanelComponent`)
- Common utility functions in `utils/` directory
- Shared styling via `shared-components.scss`

However, **glossary-view is intentionally different** - it works with `Entry` objects (published terms) while my-drafts and review-dashboard work with `ReviewDraft` objects. This fundamental difference makes extensive unification inappropriate.

## Remaining Duplication Between my-drafts and review-dashboard

### 1. Status Summary Calculation (Medium Priority)

**Current State**: Both components have `getStatusSummaryItems()` methods with similar patterns:

```typescript
// my-drafts.component.ts
getStatusSummaryItems(): StatusSummaryItem[] {
  const publishableCount = this.state.filteredDrafts.filter(d => 
    d.approvers && d.approvers.length > 0
  ).length;
  
  return [
    { count: publishableCount, label: 'ready to publish', color: '#10b981' },
    { count: this.state.filteredDrafts.length, label: 'total drafts', color: '#9ca3af' }
  ];
}

// review-dashboard.component.ts
getStatusSummaryItems(): StatusSummaryItem[] {
  return [
    { count: this.getRequestedCount(), label: 'ready to approve', color: '#3b82f6' },
    { count: this.getAlreadyApprovedCount(), label: 'already approved', color: '#10b981' },
    { count: this.state.filteredDrafts.length, label: 'total drafts', color: '#9ca3af' }
  ];
}
```

**Recommendation**: Add a method to `PanelCommonService` that takes a configuration:

```typescript
// In panel-common.service.ts
generateStatusSummary(
  filteredDrafts: ReviewDraft[], 
  context: 'my-drafts' | 'review'
): StatusSummaryItem[] {
  const totalCount = filteredDrafts.length;
  
  if (context === 'my-drafts') {
    const publishableCount = filteredDrafts.filter(d => 
      d.approvers && d.approvers.length > 0
    ).length;
    return [
      { count: publishableCount, label: 'ready to publish', color: '#10b981' },
      { count: totalCount, label: 'total drafts', color: '#9ca3af' }
    ];
  } else {
    const requestedCount = filteredDrafts.filter(
      d => d.approval_status_for_user === 'can_approve'
    ).length;
    const approvedCount = filteredDrafts.filter(
      d => d.approval_status_for_user === 'already_approved'
    ).length;
    return [
      { count: requestedCount, label: 'ready to approve', color: '#3b82f6' },
      { count: approvedCount, label: 'already approved', color: '#10b981' },
      { count: totalCount, label: 'total drafts', color: '#9ca3af' }
    ];
  }
}
```

**Files to Modify**:

- `frontend/src/app/services/panel-common.service.ts` (add method)
- `frontend/src/app/components/my-drafts/my-drafts.component.ts` (use service method)
- `frontend/src/app/components/review-dashboard/review-dashboard.component.ts` (use service method)

### 2. Loading/Error/Empty State Templates (Low Priority)

**Current State**: Both component templates have similar HTML blocks for these states:

```html
<!-- my-drafts.component.html -->
@if (state.loading) {
  <div class="three-panel-loading">...</div>
} @else if (state.error) {
  <div class="three-panel-error">...</div>
} @else if (state.filteredDrafts.length === 0) {
  <div class="three-panel-empty-state">...</div>
}

<!-- review-dashboard.component.html -->
<div *ngIf="state.loading" class="three-panel-loading">...</div>
<div *ngIf="state.error && !state.loading" class="three-panel-error">...</div>
@if (state.filteredDrafts.length === 0) {
  <div class="three-panel-no-results">...</div>
}
```

**Recommendation**: Create a `StateDisplayComponent` for these common states:

```typescript
// state-display.component.ts
@Component({
  selector: 'app-state-display',
  template: `
    @if (loading) {
      <div class="three-panel-loading">
        <div class="three-panel-loading-content">
          <div class="three-panel-loading-spinner"></div>
          <p class="three-panel-loading-text">{{ loadingMessage }}</p>
        </div>
      </div>
    } @else if (error) {
      <div class="three-panel-error">
        <div class="three-panel-error-content">
          <p class="three-panel-error-text">{{ error }}</p>
          <button (click)="retry.emit()" class="three-panel-error-button">
            Retry
          </button>
        </div>
      </div>
    } @else if (isEmpty) {
      <div class="three-panel-empty-state">
        <div class="three-panel-empty-content">
          <div class="three-panel-empty-logo">
            <img src="images/logo.png" alt="Termageddon Logo" />
          </div>
          <h2 class="three-panel-empty-title">{{ emptyTitle }}</h2>
          <p class="three-panel-empty-subtitle">{{ emptySubtitle }}</p>
        </div>
      </div>
    }
  `
})
export class StateDisplayComponent {
  @Input() loading: boolean = false;
  @Input() error: string | null = null;
  @Input() isEmpty: boolean = false;
  @Input() loadingMessage: string = 'Loading...';
  @Input() emptyTitle: string = 'No items found';
  @Input() emptySubtitle: string = 'Try adjusting your filters';
  @Output() retry = new EventEmitter<void>();
}
```

**Note**: This has diminishing returns since the templates are already quite concise and the messages need context-specific customization.

**Files to Create/Modify**:

- `frontend/src/app/components/shared/state-display/state-display.component.ts` (new)
- `frontend/src/app/components/my-drafts/my-drafts.component.html` (use component)
- `frontend/src/app/components/review-dashboard/review-dashboard.component.html` (use component)

### 3. Reviewer Dialog Wiring (Very Low Priority)

**Current State**: Both components wire up the reviewer selector dialog identically:

```html
<!-- Both components -->
<app-reviewer-selector-dialog
  [isOpen]="state.showReviewerSelector"
  [users]="state.allUsers"
  [selectedReviewerIds]="state.selectedReviewerIds"
  [draftAuthorId]="state.selectedDraft?.author?.id"
  (close)="onReviewerSelectionCancelled()"
  (confirm)="onReviewerSelectionConfirmed($event)"
>
</app-reviewer-selector-dialog>
```

**Recommendation**: Keep as-is. The wiring is already minimal and event handlers may need context-specific logic.

### 4. Edit Flow Callbacks (Very Low Priority)

**Current State**: Both components have identical placeholder methods:

```typescript
onEditRequested(): void {
  // Edit functionality is handled by the draft-detail-panel component
}

onEditCancelled(): void {
  // Edit cancellation is handled by the draft-detail-panel component
}

onEditSaved(): void {
  this.panelCommonService.refreshAfterEdit(this.state, () => {
    this.loadMyDrafts(); // or this.loadPendingDrafts()
  });
}
```

**Recommendation**: These are already well-abstracted through `panelCommonService.refreshAfterEdit()`. The minor differences (load method names) don't warrant further abstraction.

## Unification with glossary-view (Not Recommended)

**Differences By Design**:

1. **Data Model**: `Entry` vs `ReviewDraft` - fundamentally different domain objects
2. **Components**: Uses `TermListComponent`/`TermDetailComponent` vs draft components
3. **Functionality**: Browse/edit published terms vs review/approve draft changes
4. **State Management**: Simple local state vs centralized `PanelState`
5. **No Search/Filter Bar**: Has its own integrated search in `TermListComponent`

**Recommendation**: Do NOT attempt to unify glossary-view with the draft panels. The domain logic is too different and forcing unification would create unnecessary abstraction complexity.

## Priority Recommendations

### High Priority (Worth Doing Now)

✅ **Status Summary Calculation** - Clear duplication with straightforward abstraction

### Low Priority (Consider Later)

🤔 **Loading/Error/Empty State Component** - Some benefit but context-specific messages reduce value

### Not Recommended

❌ **Reviewer Dialog Wiring** - Already minimal

❌ **Edit Flow Callbacks** - Already well-abstracted

❌ **glossary-view Unification** - Fundamentally different domain

## Implementation Plan

### Phase 1: Status Summary Unification

1. Add `generateStatusSummary()` method to `PanelCommonService`
2. Update `my-drafts.component.ts` to use the new method
3. Update `review-dashboard.component.ts` to use the new method
4. Test both panels to ensure counts are correct

### Phase 2: (Optional) State Display Component

1. Create `StateDisplayComponent` in `shared/` directory
2. Update `my-drafts.component.html` to use new component
3. Update `review-dashboard.component.html` to use new component
4. Test loading, error, and empty states in both panels

## Success Criteria

- ✅ Status summary logic is centralized and both panels use it
- ✅ No functional regressions in either panel
- ✅ Code is more maintainable with clear separation of concerns
- ✅ Tests pass (if any exist)
- ✅ glossary-view remains independent (intentionally different)

## Risk Assessment

**Low Risk**: The proposed changes are localized and don't touch core functionality. The status summary abstraction is straightforward and easily testable.

## Key Principles

1. **Respect Domain Boundaries**: Don't force unification where models differ
2. **Pragmatic Abstraction**: Only abstract when duplication is clear and harmful
3. **Context Matters**: Some "duplication" is actually context-specific logic
4. **Maintainability Over DRY**: Slightly duplicated simple code can be better than complex abstraction

## Files Analysis Summary

### Already Unified

- Layout: `MasterDetailLayoutComponent` ✅
- State: `PanelCommonService` + `PanelState` ✅
- Draft operations: `PanelCommonService` methods ✅
- List items: `DraftListItemComponent` ✅
- Detail panel: `DraftDetailPanelComponent` ✅
- Search/filters: `SearchFilterBarComponent` ✅
- Status summary display: `StatusSummaryComponent` ✅
- Styling: `shared-components.scss` ✅

### Worth Unifying

- Status summary calculation logic (1 method in service)

### Not Worth Unifying

- Loading/error/empty templates (too simple, context-specific)
- Reviewer dialog wiring (already minimal)
- Edit callbacks (already abstracted)
- glossary-view (different domain)