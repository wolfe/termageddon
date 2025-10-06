import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ReviewService } from '../../services/review.service';
import { ReviewVersion, User, PaginatedResponse } from '../../models';
import { PermissionService } from '../../services/permission.service';
import { GlossaryService } from '../../services/glossary.service';
import { ReviewerSelectorDialogComponent } from '../reviewer-selector-dialog/reviewer-selector-dialog.component';

@Component({
  selector: 'app-review-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReviewerSelectorDialogComponent],
  templateUrl: './review-dashboard.component.html',
  styleUrl: './review-dashboard.component.scss',
})
export class ReviewDashboardComponent implements OnInit, OnDestroy {
  pendingVersions: ReviewVersion[] = [];
  filteredVersions: ReviewVersion[] = [];

  searchTerm: string = '';
  showAll: boolean = false;
  loading = false;
  requestingReview = false; // Separate loading state for request review
  error: string | null = null;
  currentUser: User | null = null;
  selectedVersion: ReviewVersion | null = null;
  allUsers: User[] = [];

  // Reviewer selector dialog state
  showReviewerSelector = false;
  selectedReviewerIds: number[] = [];
  versionToRequestReview: ReviewVersion | null = null;

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
    
    this.loadPendingVersions();
    this.loadUsers();
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  loadPendingVersions(callback?: () => void): void {
    this.loading = true;
    this.error = null;

    const params = this.showAll
      ? '?show_all=true&expand=entry,entry.term,entry.domain'
      : '?expand=entry,entry.term,entry.domain';

    this.reviewService.getReviewVersions(params).subscribe({
      next: (response: PaginatedResponse<ReviewVersion>) => {
        this.pendingVersions = response.results;
        this.filteredVersions = [...this.pendingVersions];
        this.loading = false;
        // Execute callback after data is loaded
        if (callback) {
          callback();
        }
      },
      error: (error) => {
        console.error('Error loading pending versions:', error);
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
      this.filteredVersions = [...this.pendingVersions];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredVersions = this.pendingVersions.filter(
      (version) =>
        version.entry.term.text.toLowerCase().includes(term) ||
        version.entry.domain.name.toLowerCase().includes(term) ||
        version.author.username.toLowerCase().includes(term) ||
        version.content.toLowerCase().includes(term),
    );
  }

  selectVersion(version: ReviewVersion): void {
    this.selectedVersion = version;
  }

  canApprove(version: ReviewVersion): boolean {
    if (!this.currentUser) return false;

    // Cannot approve own versions
    if (version.author.id === this.currentUser.id) return false;

    // Cannot approve if already approved this version
    if (
      version.approvers.some((approver) => approver.id === this.currentUser!.id)
    )
      return false;

    // Can approve if status is pending
    return !version.is_approved;
  }

  approveVersion(): void {
    if (!this.selectedVersion) return;

    this.loading = true;

    this.reviewService.approveVersion(this.selectedVersion.id).subscribe({
      next: (updatedVersion) => {
        alert(
          `Successfully approved "${this.selectedVersion!.entry.term.text}"`,
        );

        // Remove the approved version from our list
        this.pendingVersions = this.pendingVersions.filter(
          (v) => v.id !== this.selectedVersion!.id,
        );
        this.filteredVersions = this.filteredVersions.filter(
          (v) => v.id !== this.selectedVersion!.id,
        );

        // Deselect the version
        this.selectedVersion = null;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error approving version:', error);
        alert('Failed to approve version. Please try again.');
        this.loading = false;
      },
    });
  }

  trackByVersionId(index: number, version: ReviewVersion): number {
    return version.id;
  }

  isOwnVersion(): boolean {
    return this.selectedVersion?.author.id === this.currentUser?.id;
  }

  hasAlreadyApproved(): boolean {
    if (!this.selectedVersion || !this.currentUser) return false;
    return this.selectedVersion.approvers.some(
      (a) => a.id === this.currentUser!.id,
    );
  }

  getApprovalStatus(): string {
    if (!this.selectedVersion) return '';

    if (this.selectedVersion.is_approved) {
      return 'Approved';
    }
    return `${this.selectedVersion.approval_count}/2 Approvals`;
  }

  getRemainingApprovals(): number {
    if (!this.selectedVersion) return 0;
    return Math.max(0, 2 - this.selectedVersion.approval_count);
  }

  getApprovalAccessLevel(): string {
    if (!this.selectedVersion || !this.currentUser) return 'cannotApprove';

    if (this.selectedVersion.author.id === this.currentUser.id) {
      return 'ownVersion';
    }

    if (this.hasAlreadyApproved()) {
      return 'alreadyApproved';
    }

    if (this.selectedVersion.is_approved) {
      return 'alreadyApprovedByOthers';
    }

    if (this.canApprove(this.selectedVersion)) {
      return 'canApprove';
    }

    return 'cannotApprove';
  }

  getApprovalReason(): string {
    if (!this.selectedVersion) return 'No version selected';
    if (!this.currentUser) return 'Please log in to approve definitions';
    if (this.selectedVersion.is_approved)
      return 'This definition has already been approved by others';
    return 'This definition cannot be approved at this time';
  }

  getVersionEligibilityStatus(version: ReviewVersion): string {
    if (!this.currentUser) return 'unknown';

    if (version.author.id === this.currentUser.id) {
      return 'ownVersion';
    }

    if (
      version.approvers.some((approver) => approver.id === this.currentUser!.id)
    ) {
      return 'alreadyApproved';
    }

    return 'canApprove';
  }

  getEligibilityText(version: ReviewVersion): string {
    const status = this.getVersionEligibilityStatus(version);
    switch (status) {
      case 'ownVersion':
        return 'Your version';
      case 'alreadyApproved':
        return 'Already approved';
      case 'canApprove':
        return 'Ready to approve';
      default:
        return 'Unknown';
    }
  }

  getEligibilityClass(version: ReviewVersion): string {
    const status = this.getVersionEligibilityStatus(version);
    switch (status) {
      case 'ownVersion':
        return 'text-gray-500 bg-gray-100';
      case 'alreadyApproved':
        return 'text-green-600 bg-green-50';
      case 'canApprove':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-500 bg-gray-100';
    }
  }

  getEligibleCount(): number {
    return this.filteredVersions.filter(
      (v) => this.getVersionEligibilityStatus(v) === 'canApprove',
    ).length;
  }

  getAlreadyApprovedCount(): number {
    return this.filteredVersions.filter(
      (v) => this.getVersionEligibilityStatus(v) === 'alreadyApproved',
    ).length;
  }

  getOwnVersionsCount(): number {
    return this.filteredVersions.filter(
      (v) => this.getVersionEligibilityStatus(v) === 'ownVersion',
    ).length;
  }

  onShowAllChange(): void {
    // Store the current search term before reloading
    const currentSearchTerm = this.searchTerm;
    this.loadPendingVersions(() => {
      // Restore the search term and reapply the filter after data is loaded
      this.searchTerm = currentSearchTerm;
      this.onSearch();
    });
  }

  requestReview(version: ReviewVersion): void {
    this.versionToRequestReview = version;
    this.selectedReviewerIds = version.requested_reviewers.map((r) => r.id);
    this.showReviewerSelector = true;
  }

  onReviewerSelectionConfirmed(reviewerIds: number[]): void {
    if (!this.versionToRequestReview) return;

    this.requestingReview = true;
    this.reviewService
      .requestReview(this.versionToRequestReview.id, reviewerIds)
      .subscribe({
        next: (updatedVersion) => {
          // Refresh the data from server to get updated state
          this.loadPendingVersions();
          
          // Update selected version if it's the same
          if (this.selectedVersion?.id === this.versionToRequestReview?.id) {
            this.selectedVersion = updatedVersion as unknown as ReviewVersion;
          }

          this.requestingReview = false;
          this.showReviewerSelector = false;
          this.versionToRequestReview = null;
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
    this.versionToRequestReview = null;
    this.selectedReviewerIds = [];
  }

  publishVersion(version: ReviewVersion): void {
    if (!version.is_approved) {
      alert('Version must be approved before publishing');
      return;
    }

    if (
      confirm(
        'Are you sure you want to publish this version? This will make it the active version.',
      )
    ) {
      this.reviewService.publishVersion(version.id).subscribe({
        next: (updatedVersion) => {
          // Update the version in the list
          const index = this.pendingVersions.findIndex(
            (v) => v.id === version.id,
          );
          if (index !== -1) {
            this.pendingVersions[index] =
              updatedVersion as unknown as ReviewVersion;
            this.filteredVersions = [...this.pendingVersions];
          }
          alert('Version published successfully!');
        },
        error: (error) => {
          console.error('Error publishing version:', error);
          alert(
            'Failed to publish version: ' +
              (error.error?.detail || 'Unknown error'),
          );
        },
      });
    }
  }
}
