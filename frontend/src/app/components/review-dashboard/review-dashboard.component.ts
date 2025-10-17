import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ReviewDraft, User, PaginatedResponse, Comment } from '../../models';
import { PermissionService } from '../../services/permission.service';
import { NotificationService } from '../../services/notification.service';
import { EntryDetailService } from '../../services/entry-detail.service';
import { PanelCommonService, PanelState } from '../../services/panel-common.service';
import { GlossaryService } from '../../services/glossary.service';
import { UrlHelperService } from '../../services/url-helper.service';
import { ReviewerSelectorDialogComponent } from '../reviewer-selector-dialog/reviewer-selector-dialog.component';
import { MasterDetailLayoutComponent } from '../shared/master-detail-layout/master-detail-layout.component';
import { SearchFilterBarComponent, FilterConfig, Perspective, SortOption } from '../shared/search-filter-bar/search-filter-bar.component';
import { DraftListItemComponent } from '../shared/draft-list-item/draft-list-item.component';
import { DraftDetailPanelComponent } from '../shared/draft-detail-panel/draft-detail-panel.component';
import { StatusSummaryComponent, StatusSummaryItem } from '../shared/status-summary/status-summary.component';
import { CreateEntryDialogComponent } from '../create-entry-dialog/create-entry-dialog.component';
import { getDraftStatus, getDraftStatusClass, getApprovalStatusText, getEligibilityText, getEligibilityClass, getApprovalReason, canPublish, canApprove, getRemainingApprovals, getApprovalAccessLevel } from '../../utils/draft-status.util';
import { getInitials } from '../../utils/user.util';

@Component({
  selector: 'app-review-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ReviewerSelectorDialogComponent,
    MasterDetailLayoutComponent,
    SearchFilterBarComponent,
    DraftListItemComponent,
    DraftDetailPanelComponent,
    StatusSummaryComponent,
    CreateEntryDialogComponent
  ],
  templateUrl: './review-dashboard.component.html',
  styleUrl: './review-dashboard.component.scss',
})
export class ReviewDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Use centralized panel state
  state: PanelState;
  
  // Review-specific state
  showAll: boolean = false; // Show all drafts (not just requested ones)
  isEditMode: boolean = false; // Track edit mode for auto-editing
  showCreateDialog: boolean = false;

  // Unified filter state
  perspectives: Perspective[] = [];
  selectedPerspectiveId: number | null = null;
  selectedAuthorId: number | null = null;
  selectedSortBy: string = '-published_at'; // Default to newest published first
  pendingPerspectiveId: number | null = null; // Store perspective ID from URL if perspectives not loaded yet
  
  // Sort options
  sortOptions: SortOption[] = [
    { value: '-published_at', label: 'Newest Published' },
    { value: '-timestamp', label: 'Newest Edits' },
    { value: 'entry__term__text_normalized', label: 'Term A-Z' },
    { value: '-entry__term__text_normalized', label: 'Term Z-A' }
  ];

  // Filter configuration
  filters: FilterConfig[] = [
    {
      id: 'showAll',
      label: 'Show all drafts (not just requested to review)',
      type: 'checkbox',
      value: false
    }
  ];

  // Utility functions
  getDraftStatus = getDraftStatus;
  getDraftStatusClass = getDraftStatusClass;
  getApprovalStatusText = getApprovalStatusText;
  getEligibilityText = getEligibilityText;
  getEligibilityClass = getEligibilityClass;
  getApprovalReason = getApprovalReason;
  canPublish = canPublish;
  canApprove = canApprove;
  getRemainingApprovals = getRemainingApprovals;
  getApprovalAccessLevel = getApprovalAccessLevel;
  getInitials = getInitials;

  constructor(
    private permissionService: PermissionService,
    private notificationService: NotificationService,
    private entryDetailService: EntryDetailService,
    private panelCommonService: PanelCommonService,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private glossaryService: GlossaryService,
    private urlHelper: UrlHelperService
  ) {
    this.state = this.panelCommonService.initializePanelState();
  }

  ngOnInit(): void {
    this.state.currentUser = this.permissionService.currentUser;
    this.loadPerspectives();
    this.panelCommonService.loadUsers(this.state);
    
    // Subscribe to route parameters first
    this.route.queryParams.subscribe(params => {
      const draftId = params['draftId'];
      const entryId = params['entryId'];
      const editMode = params['edit'] === 'true';
      
      // Handle filter parameters from URL
      this.handleUrlFilterParams(params);
      
      // Always load the draft list first (for the left panel)
      this.loadPendingDrafts();
      
      // Then handle specific draft/entry selection
      if (draftId) {
        this.loadDraftById(+draftId);
      } else if (entryId) {
        // Handle entry-based navigation (for existing entries)
        this.loadEntryById(+entryId, editMode);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPerspectives(): void {
    this.glossaryService.getPerspectives()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (perspectives) => {
          this.perspectives = perspectives.results.map((p: any) => ({ id: p.id, name: p.name }));
          
          // Apply pending perspective ID from URL if available
          if (this.pendingPerspectiveId) {
            this.selectedPerspectiveId = this.pendingPerspectiveId;
            this.pendingPerspectiveId = null;
          }
        },
        error: (error) => {
          console.error('Error loading perspectives:', error);
        }
      });
  }

  loadPendingDrafts(callback?: () => void): void {
    // Load drafts based on showAll setting with new filters
    const options = {
      eligibility: (this.showAll ? 'all_except_own' : 'requested_or_approved') as 'all_except_own' | 'requested_or_approved',
      showAll: this.showAll,
      perspectiveId: this.selectedPerspectiveId || undefined,
      sortBy: this.selectedSortBy
    };
    
    this.panelCommonService.loadDrafts(options, this.state, this.route);
    
    // Execute callback after data is loaded
    if (callback) {
      callback();
    }
  }

  private hasRelevantUrlParams(): boolean {
    return this.panelCommonService.hasRelevantUrlParams(this.route);
  }

  private handleUrlFilterParams(params: any): void {
    // Handle perspective filter parameter
    if (params['perspective']) {
      const perspectiveId = +params['perspective'];
      if (this.perspectives.length > 0) {
        // Perspectives already loaded, set filter
        this.selectedPerspectiveId = perspectiveId;
      } else {
        // Perspectives not loaded yet, store for later
        this.pendingPerspectiveId = perspectiveId;
      }
    }
  }


  onSearch(): void {
    this.panelCommonService.onSearch(this.state.searchTerm, this.state, { 
      eligibility: (this.showAll ? 'all_except_own' : 'requested_or_approved') as 'all_except_own' | 'requested_or_approved', 
      showAll: this.showAll,
      perspectiveId: this.selectedPerspectiveId || undefined,
      sortBy: this.selectedSortBy
    });
  }

  selectDraft(draft: ReviewDraft): void {
    this.panelCommonService.selectDraft(draft, this.state);
    this.updateUrl(draft);
  }

  private loadDraftById(draftId: number, editMode: boolean = false): void {
    this.isEditMode = editMode;
    this.glossaryService.getDraftById(draftId).subscribe({
      next: (draft) => {
        this.selectDraft(draft);
        // If edit mode is requested, trigger edit after a short delay to ensure UI is ready
        if (editMode) {
          setTimeout(() => {
            this.triggerEditMode();
          }, 100);
        }
      },
      error: (error) => {
        console.error('Failed to load draft:', error);
        // If we get a 404, the draft doesn't exist - redirect to My Drafts to create one
        if (error.status === 404) {
          console.log('Draft not found, redirecting to My Drafts to create new draft');
          this.router.navigate(['/my-drafts'], { 
            queryParams: { entryId: this.getEntryIdFromUrl(), edit: 'true' } 
          });
        } else {
          // For other errors, navigate back to review without specific draft
          this.router.navigate(['/review']);
        }
      }
    });
  }

  private triggerEditMode(): void {
    // This will be handled by the draft-detail-panel component
    // We just need to set a flag that the panel can check
    this.isEditMode = true;
  }

  private getEntryIdFromUrl(): number | null {
    const entryId = this.route.snapshot.queryParams['entryId'];
    return entryId ? parseInt(entryId, 10) : null;
  }

  private updateUrl(draft: ReviewDraft): void {
    const url = this.urlHelper.buildDraftUrl(draft.id, draft, true);
    this.location.replaceState(url);
  }


  approveDraft(): void {
    if (!this.state.selectedDraft) return;
    this.panelCommonService.approveDraft(this.state.selectedDraft, this.state, () => {
      // Additional cleanup specific to ReviewDashboard if needed
    });
  }

  trackByDraftId(index: number, draft: ReviewDraft): number {
    return draft.id;
  }

  isOwnDraft(): boolean {
    return this.state.selectedDraft?.author.id === this.state.currentUser?.id;
  }

  hasAlreadyApproved(): boolean {
    if (!this.state.selectedDraft) return false;
    // Use backend field instead of client-side logic
    return this.state.selectedDraft.user_has_approved ?? false;
  }

  getAlreadyApprovedCount(): number {
    return this.state.filteredDrafts.filter(
      (d) => d.approval_status_for_user === 'already_approved',
    ).length;
  }

  getRequestedCount(): number {
    return this.state.filteredDrafts.filter(
      (d) => d.approval_status_for_user === 'can_approve',
    ).length;
  }

  onShowAllChange(): void {
    // Store the current search term before reloading
    const currentSearchTerm = this.state.searchTerm;
    this.loadPendingDrafts(() => {
      // Restore the search term and reapply the filter after data is loaded
      this.state.searchTerm = currentSearchTerm;
      this.onSearch();
    });
  }

  onFilterChanged(event: { filterId: string; value: any }): void {
    if (event.filterId === 'showAll') {
      this.showAll = event.value;
      this.onShowAllChange();
    }
  }

  onPerspectiveChanged(perspectiveId: number | null): void {
    this.selectedPerspectiveId = perspectiveId;
    this.loadPendingDrafts();
  }

  onAuthorChanged(authorId: number | null): void {
    this.selectedAuthorId = authorId;
    this.loadPendingDrafts();
  }

  onSortChanged(sortBy: string): void {
    this.selectedSortBy = sortBy;
    this.loadPendingDrafts();
  }

  onClearFilters(): void {
    this.state.searchTerm = '';
    this.selectedPerspectiveId = null;
    this.selectedAuthorId = null;
    // Keep showAll filter as-is (it's in the filters array, not in the unified filters)
    this.loadPendingDrafts();
  }

  requestReview(draft: ReviewDraft): void {
    this.panelCommonService.showReviewerSelector(draft, this.state);
  }

  onReviewerSelectionConfirmed(reviewerIds: number[]): void {
    if (!this.state.draftToRequestReview) return;
    this.panelCommonService.requestReview(this.state.draftToRequestReview.id, reviewerIds, this.state, () => {
      // Refresh the data from server to get updated state
      this.loadPendingDrafts();
      
      // Update selected draft if it's the same
      if (this.state.selectedDraft?.id === this.state.draftToRequestReview?.id) {
        this.state.selectedDraft = this.state.draftToRequestReview;
      }
    });
  }

  onReviewerSelectionCancelled(): void {
    this.panelCommonService.hideReviewerSelector(this.state);
  }

  publishDraft(draft: ReviewDraft): void {
    if (!draft.is_approved) {
      this.notificationService.warning('Draft must be approved before publishing');
      return;
    }

    // TODO: Replace with confirmation dialog
    if (
      confirm(
        'Are you sure you want to publish this draft? This will make it the active draft.',
      )
    ) {
      this.panelCommonService.publishDraft(draft, this.state, () => {
        // Clear the selected draft since it's no longer in the review list
        this.state.selectedDraft = null;
        // Reload the drafts to get the updated list (published draft will be excluded)
        this.loadPendingDrafts();
      });
    }
  }


  onCommentAdded(comment: Comment): void {
    this.panelCommonService.onCommentAdded(comment, this.state);
  }

  onCommentResolved(comment: Comment): void {
    this.panelCommonService.onCommentResolved(comment, this.state);
  }

  onCommentUnresolved(comment: Comment): void {
    this.panelCommonService.onCommentUnresolved(comment, this.state);
  }

  // Edit functionality
  canEditDraft(): boolean {
    // Any user can edit the latest version in Review context
    return !!this.state.selectedDraft && !!this.state.currentUser;
  }

  onEditRequested(): void {
    // Edit functionality is handled by the draft-detail-panel component
  }

  onEditSaved(): void {
    this.panelCommonService.refreshAfterEdit(this.state, () => {
      this.loadPendingDrafts();
    });
  }

  onEditCancelled(): void {
    // Edit cancellation is handled by the draft-detail-panel component
  }

  /**
   * Load entry by ID and find the appropriate draft to show
   */
  private loadEntryById(entryId: number, editMode: boolean = false): void {
    this.glossaryService.getEntry(entryId).subscribe({
      next: (entry) => {
        // Find the appropriate draft for this entry
        if (entry.active_draft) {
          // Load the active draft
          this.loadDraftById(entry.active_draft.id, editMode);
        } else {
          // No active draft - redirect to My Drafts to create one
          console.log('No active draft found, redirecting to My Drafts to create draft');
          this.router.navigate(['/my-drafts'], { 
            queryParams: { entryId, edit: 'true' } 
          });
        }
      },
      error: (error) => {
        console.error('Failed to load entry:', error);
        this.state.error = 'Failed to load entry details';
      }
    });
  }

  getStatusSummaryItems(): StatusSummaryItem[] {
    return [
      { count: this.getRequestedCount(), label: 'ready to approve', color: '#3b82f6' },
      { count: this.getAlreadyApprovedCount(), label: 'already approved', color: '#10b981' },
      { count: this.state.filteredDrafts.length, label: 'total drafts', color: '#9ca3af' }
    ];
  }

  // Create Entry functionality
  openCreateDialog(): void {
    this.showCreateDialog = true;
  }

  onDialogClosed(): void {
    this.showCreateDialog = false;
  }

  onTermCreated(entry: any): void {
    this.showCreateDialog = false;
    // Refresh the drafts list to show the new entry
    this.loadPendingDrafts();
  }

  navigateToMyDrafts(): void {
    this.router.navigate(['/my-drafts']);
  }
}
