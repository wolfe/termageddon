import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ReviewService } from '../../services/review.service';
import { ReviewDraft, User, PaginatedResponse, Comment } from '../../models';
import { PermissionService } from '../../services/permission.service';
import { GlossaryService } from '../../services/glossary.service';
import { NotificationService } from '../../services/notification.service';
import { EntryDetailService } from '../../services/entry-detail.service';
import { PanelCommonService, PanelState } from '../../services/panel-common.service';
import { ReviewerSelectorDialogComponent } from '../reviewer-selector-dialog/reviewer-selector-dialog.component';
import { MasterDetailLayoutComponent } from '../shared/master-detail-layout/master-detail-layout.component';
import { SearchFilterBarComponent, FilterConfig } from '../shared/search-filter-bar/search-filter-bar.component';
import { DraftListItemComponent } from '../shared/draft-list-item/draft-list-item.component';
import { DraftDetailPanelComponent } from '../shared/draft-detail-panel/draft-detail-panel.component';
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
    DraftDetailPanelComponent
  ],
  templateUrl: './review-dashboard.component.html',
  styleUrl: './review-dashboard.component.scss',
})
export class ReviewDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Use centralized panel state
  state: PanelState;
  
  // Review-specific state
  showAll: boolean = false;

  // Filter configuration
  filters: FilterConfig[] = [
    {
      id: 'showAll',
      label: 'Show all drafts (not just relevant to you)',
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
    private reviewService: ReviewService,
    private permissionService: PermissionService,
    private glossaryService: GlossaryService,
    private notificationService: NotificationService,
    private entryDetailService: EntryDetailService,
    private panelCommonService: PanelCommonService
  ) {
    this.state = this.panelCommonService.initializePanelState();
  }

  ngOnInit(): void {
    this.state.currentUser = this.permissionService.currentUser;
    this.loadPendingDrafts();
    this.panelCommonService.loadUsers(this.state);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPendingDrafts(callback?: () => void): void {
    this.panelCommonService.loadDrafts(
      () => this.reviewService.getDraftsCanApprove(this.showAll),
      this.state
    );
    
    // Execute callback after data is loaded
    if (callback) {
      callback();
    }
  }


  onSearch(): void {
    this.panelCommonService.onSearch(this.state.searchTerm, this.state, (term: string) => {
      return this.reviewService.searchDrafts(term, this.showAll);
    });
  }

  selectDraft(draft: ReviewDraft): void {
    this.panelCommonService.selectDraft(draft, this.state);
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

  getEligibleCount(): number {
    return this.state.filteredDrafts.filter(
      (d) => d.approval_status_for_user === 'can_approve',
    ).length;
  }

  getAlreadyApprovedCount(): number {
    return this.state.filteredDrafts.filter(
      (d) => d.approval_status_for_user === 'already_approved',
    ).length;
  }

  getOwnDraftsCount(): number {
    return this.state.filteredDrafts.filter(
      (d) => d.approval_status_for_user === 'own_draft',
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
}
