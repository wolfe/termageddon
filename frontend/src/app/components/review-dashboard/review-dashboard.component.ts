import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ReviewService } from '../../services/review.service';
import { ReviewDraft, User, PaginatedResponse, Comment } from '../../models';
import { PermissionService } from '../../services/permission.service';
import { GlossaryService } from '../../services/glossary.service';
import { ReviewerSelectorDialogComponent } from '../reviewer-selector-dialog/reviewer-selector-dialog.component';
import { CommentThreadComponent } from '../comment-thread/comment-thread.component';

@Component({
  selector: 'app-review-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReviewerSelectorDialogComponent, CommentThreadComponent],
  templateUrl: './review-dashboard.component.html',
  styleUrl: './review-dashboard.component.scss',
})
export class ReviewDashboardComponent implements OnInit, OnDestroy {
  pendingDrafts: ReviewDraft[] = [];
  filteredDrafts: ReviewDraft[] = [];

  searchTerm: string = '';
  showAll: boolean = false;
  loading = false;
  requestingReview = false; // Separate loading state for request review
  error: string | null = null;
  currentUser: User | null = null;
  selectedDraft: ReviewDraft | null = null;
  allUsers: User[] = [];

  // Reviewer selector dialog state
  showReviewerSelector = false;
  selectedReviewerIds: number[] = [];
  draftToRequestReview: ReviewDraft | null = null;

  // Comment state
  comments: Comment[] = [];
  isLoadingComments = false;

  // Subscription management
  private userSubscription?: Subscription;

  constructor(
    private reviewService: ReviewService,
    private permissionService: PermissionService,
    private glossaryService: GlossaryService,
  ) {}

  ngOnInit(): void {
    // Subscribe to current user changes
    this.userSubscription = this.permissionService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
    
    this.loadPendingDrafts();
    this.loadUsers();
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  loadPendingDrafts(callback?: () => void): void {
    this.loading = true;
    this.error = null;

    // Use new backend eligibility filtering instead of client-side logic
    this.reviewService.getDraftsCanApprove(this.showAll).subscribe({
      next: (response: PaginatedResponse<ReviewDraft>) => {
        this.pendingDrafts = response.results;
        this.filteredDrafts = [...this.pendingDrafts];
        this.loading = false;
        // Execute callback after data is loaded
        if (callback) {
          callback();
        }
      },
      error: (error) => {
        console.error('Error loading pending drafts:', error);
        this.error = 'Failed to load review data';
        this.loading = false;
      },
    });
  }

  loadUsers(): void {
    this.glossaryService.getUsers().subscribe({
      next: (users) => {
        this.allUsers = users;
      },
      error: (error) => {
        console.error('Error loading users:', error);
      },
    });
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredDrafts = [...this.pendingDrafts];
      return;
    }

    // Use backend search instead of client-side filtering
    this.loading = true;
    this.reviewService.searchDrafts(this.searchTerm, this.showAll).subscribe({
      next: (response: PaginatedResponse<ReviewDraft>) => {
        this.filteredDrafts = response.results;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error searching drafts:', error);
        this.error = 'Failed to search drafts';
        this.loading = false;
      },
    });
  }

  selectDraft(draft: ReviewDraft): void {
    this.selectedDraft = draft;
    this.loadComments();
  }

  canApprove(draft: ReviewDraft): boolean {
    // Use backend field instead of client-side logic
    return draft.can_approve_by_current_user ?? false;
  }

  approveDraft(): void {
    if (!this.selectedDraft) return;

    this.loading = true;

    this.reviewService.approveDraft(this.selectedDraft.id).subscribe({
      next: (updatedDraft) => {
        alert(
          `Successfully approved "${this.selectedDraft!.entry.term.text}"`,
        );

        // Remove the approved draft from our list
        this.pendingDrafts = this.pendingDrafts.filter(
          (d) => d.id !== this.selectedDraft!.id,
        );
        this.filteredDrafts = this.filteredDrafts.filter(
          (d) => d.id !== this.selectedDraft!.id,
        );

        // Deselect the draft
        this.selectedDraft = null;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error approving draft:', error);
        alert('Failed to approve draft. Please try again.');
        this.loading = false;
      },
    });
  }

  trackByDraftId(index: number, draft: ReviewDraft): number {
    return draft.id;
  }

  isOwnDraft(): boolean {
    return this.selectedDraft?.author.id === this.currentUser?.id;
  }

  hasAlreadyApproved(): boolean {
    if (!this.selectedDraft) return false;
    // Use backend field instead of client-side logic
    return this.selectedDraft.user_has_approved ?? false;
  }

  getApprovalStatus(): string {
    if (!this.selectedDraft) return '';

    if (this.selectedDraft.is_approved) {
      return 'Approved';
    }
    return `${this.selectedDraft.approval_count}/2 Approvals`;
  }

  getRemainingApprovals(): number {
    if (!this.selectedDraft) return 0;
    // Use backend field instead of hardcoded calculation
    return this.selectedDraft.remaining_approvals ?? 0;
  }

  getApprovalAccessLevel(): string {
    if (!this.selectedDraft) return 'cannotApprove';
    // Use backend field instead of client-side logic
    return this.selectedDraft.approval_status_for_user ?? 'unknown';
  }

  getApprovalReason(): string {
    if (!this.selectedDraft) return 'No draft selected';
    if (!this.currentUser) return 'Please log in to approve definitions';
    
    // Use the backend-provided approval status for more specific messaging
    const status = this.selectedDraft.approval_status_for_user ?? 'unknown';
    
    switch (status) {
      case 'own_draft':
        return 'You cannot approve your own definition';
      case 'already_approved':
        return 'You have already approved this definition';
      case 'already_approved_by_others':
        return 'This definition has already been approved by others';
      case 'can_approve':
        return 'This definition is ready for your approval';
      case 'unknown':
        return 'Unable to determine approval status';
      default:
        return 'This definition cannot be approved at this time';
    }
  }

  getDraftEligibilityStatus(draft: ReviewDraft): string {
    // Use backend field instead of client-side logic
    return draft.approval_status_for_user ?? 'unknown';
  }

  getEligibilityText(draft: ReviewDraft): string {
    const status = draft.approval_status_for_user ?? 'unknown';
    switch (status) {
      case 'own_draft':
        return 'Your draft';
      case 'already_approved':
        return 'Already approved';
      case 'can_approve':
        return 'Ready to approve';
      case 'already_approved_by_others':
        return 'Approved by others';
      default:
        return 'Unknown';
    }
  }

  getEligibilityClass(draft: ReviewDraft): string {
    const status = draft.approval_status_for_user ?? 'unknown';
    switch (status) {
      case 'own_draft':
        return 'text-gray-500 bg-gray-100';
      case 'already_approved':
        return 'text-green-600 bg-green-50';
      case 'can_approve':
        return 'text-blue-600 bg-blue-50';
      case 'already_approved_by_others':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-500 bg-gray-100';
    }
  }

  getEligibleCount(): number {
    return this.filteredDrafts.filter(
      (d) => d.approval_status_for_user === 'can_approve',
    ).length;
  }

  getAlreadyApprovedCount(): number {
    return this.filteredDrafts.filter(
      (d) => d.approval_status_for_user === 'already_approved',
    ).length;
  }

  getOwnDraftsCount(): number {
    return this.filteredDrafts.filter(
      (d) => d.approval_status_for_user === 'own_draft',
    ).length;
  }

  onShowAllChange(): void {
    // Store the current search term before reloading
    const currentSearchTerm = this.searchTerm;
    this.loadPendingDrafts(() => {
      // Restore the search term and reapply the filter after data is loaded
      this.searchTerm = currentSearchTerm;
      this.onSearch();
    });
  }

  requestReview(draft: ReviewDraft): void {
    this.draftToRequestReview = draft;
    this.selectedReviewerIds = draft.requested_reviewers.map((r) => r.id);
    this.showReviewerSelector = true;
  }

  onReviewerSelectionConfirmed(reviewerIds: number[]): void {
    if (!this.draftToRequestReview) return;

    this.requestingReview = true;
    this.reviewService
      .requestReview(this.draftToRequestReview.id, reviewerIds)
      .subscribe({
        next: (updatedDraft) => {
          // Refresh the data from server to get updated state
          this.loadPendingDrafts();
          
          // Update selected draft if it's the same
          if (this.selectedDraft?.id === this.draftToRequestReview?.id) {
            this.selectedDraft = updatedDraft as unknown as ReviewDraft;
          }

          this.requestingReview = false;
          this.showReviewerSelector = false;
          this.draftToRequestReview = null;
          this.selectedReviewerIds = [];
        },
        error: (error) => {
          console.error('Error requesting review:', error);
          alert(
            'Failed to request review: ' +
              (error.error?.detail || 'Unknown error'),
          );
          this.requestingReview = false;
        },
      });
  }

  onReviewerSelectionCancelled(): void {
    this.showReviewerSelector = false;
    this.draftToRequestReview = null;
    this.selectedReviewerIds = [];
  }

  publishDraft(draft: ReviewDraft): void {
    if (!draft.is_approved) {
      alert('Draft must be approved before publishing');
      return;
    }

    if (
      confirm(
        'Are you sure you want to publish this draft? This will make it the active draft.',
      )
    ) {
      this.reviewService.publishDraft(draft.id).subscribe({
        next: (updatedDraft) => {
          alert('Draft published successfully!');
          // Clear the selected draft since it's no longer in the review list
          this.selectedDraft = null;
          // Reload the drafts to get the updated list (published draft will be excluded)
          this.loadPendingDrafts();
        },
        error: (error) => {
          console.error('Error publishing draft:', error);
          alert(
            'Failed to publish draft: ' +
              (error.error?.detail || 'Unknown error'),
          );
        },
      });
    }
  }

  loadComments(): void {
    if (!this.selectedDraft?.entry?.id) return;
    
    this.isLoadingComments = true;
    this.glossaryService.getComments(1, this.selectedDraft.entry.id)
      .subscribe({
        next: (response: PaginatedResponse<Comment>) => {
          this.comments = response.results;
          this.isLoadingComments = false;
        },
        error: (error) => {
          console.error('Error loading comments:', error);
          this.isLoadingComments = false;
        }
      });
  }

  onCommentAdded(comment: Comment): void {
    this.comments.push(comment);
  }

  onCommentResolved(comment: Comment): void {
    const index = this.comments.findIndex(c => c.id === comment.id);
    if (index !== -1) {
      this.comments[index] = comment;
    }
  }

  onCommentUnresolved(comment: Comment): void {
    const index = this.comments.findIndex(c => c.id === comment.id);
    if (index !== -1) {
      this.comments[index] = comment;
    }
  }
}
