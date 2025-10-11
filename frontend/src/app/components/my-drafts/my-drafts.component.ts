import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ReviewService } from '../../services/review.service';
import { GlossaryService } from '../../services/glossary.service';
import { PermissionService } from '../../services/permission.service';
import { EntryDetailService } from '../../services/entry-detail.service';
import { ReviewerSelectorDialogComponent } from '../reviewer-selector-dialog/reviewer-selector-dialog.component';
import { MasterDetailLayoutComponent } from '../shared/master-detail-layout/master-detail-layout.component';
import { SearchFilterBarComponent } from '../shared/search-filter-bar/search-filter-bar.component';
import { DraftListItemComponent } from '../shared/draft-list-item/draft-list-item.component';
import { DraftDetailPanelComponent } from '../shared/draft-detail-panel/draft-detail-panel.component';
import { ReviewDraft, PaginatedResponse, User, Comment } from '../../models';
import { getDraftStatus, getDraftStatusClass, canPublish } from '../../utils/draft-status.util';
import { getInitials } from '../../utils/user.util';

@Component({
  selector: 'app-my-drafts',
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
  templateUrl: './my-drafts.component.html',
  styleUrls: ['./my-drafts.component.scss'],
})
export class MyDraftsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  drafts: ReviewDraft[] = [];
  filteredDrafts: ReviewDraft[] = [];
  selectedDraft: ReviewDraft | null = null;
  loading = false;
  error: string | null = null;
  searchTerm = '';
  currentUser: User | null = null;
  
  // Reviewer selection
  showReviewerSelector = false;
  allUsers: User[] = [];
  selectedReviewerIds: number[] = [];
  
  // Comments
  comments: Comment[] = [];
  isLoadingComments = false;

  constructor(
    private reviewService: ReviewService,
    private glossaryService: GlossaryService,
    private permissionService: PermissionService,
    private entryDetailService: EntryDetailService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.permissionService.currentUser;
    this.loadMyDrafts();
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMyDrafts(): void {
    this.loading = true;
    this.error = null;

    this.reviewService.getOwnDrafts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PaginatedResponse<ReviewDraft>) => {
          // Filter to show only the latest draft per entry
          this.drafts = this.getLatestDraftsPerEntry(response.results);
          this.filteredDrafts = [...this.drafts];
          // Auto-select first draft if available
          if (this.drafts.length > 0 && !this.selectedDraft) {
            this.selectedDraft = this.drafts[0];
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading my drafts:', error);
          this.error = 'Failed to load your drafts';
          this.loading = false;
        }
      });
  }

  /**
   * Filter drafts to show only the latest draft per entry
   * This ensures we don't show multiple drafts for the same entry
   */
  private getLatestDraftsPerEntry(drafts: ReviewDraft[]): ReviewDraft[] {
    const latestDraftsMap = new Map<number, ReviewDraft>();
    
    // Group drafts by entry ID and keep only the latest one
    drafts.forEach(draft => {
      const entryId = draft.entry.id;
      const existingDraft = latestDraftsMap.get(entryId);
      
      if (!existingDraft || new Date(draft.timestamp) > new Date(existingDraft.timestamp)) {
        latestDraftsMap.set(entryId, draft);
      }
    });
    
    // Convert back to array and sort by timestamp (newest first)
    return Array.from(latestDraftsMap.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredDrafts = [...this.drafts];
      return;
    }

    // Use backend search instead of client-side filtering
    this.loading = true;
    this.reviewService.searchDrafts(this.searchTerm, false).subscribe({
      next: (response: PaginatedResponse<ReviewDraft>) => {
        // Filter results to only show own drafts and apply latest-only filtering
        const ownDrafts = response.results.filter(draft => 
          draft.author.id === this.currentUser?.id
        );
        this.filteredDrafts = this.getLatestDraftsPerEntry(ownDrafts);
        this.loading = false;
        
        // If current selection is not in filtered results, select first available
        if (this.selectedDraft && !this.filteredDrafts.find(d => d.id === this.selectedDraft!.id)) {
          this.selectedDraft = this.filteredDrafts.length > 0 ? this.filteredDrafts[0] : null;
        }
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
    this.loadComments(); // Load comments for the selected draft
  }

  loadUsers(): void {
    this.glossaryService.getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users: User[]) => {
          this.allUsers = users;
        },
        error: (error) => {
          console.error('Error loading users:', error);
        }
      });
  }

  loadComments(): void {
    if (!this.selectedDraft?.entry?.id) return;
    
    this.isLoadingComments = true;
    this.entryDetailService.loadCommentsWithPositions(this.selectedDraft.entry.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (comments) => {
          this.comments = comments;
          this.isLoadingComments = false;
        },
        error: (error) => {
          console.error('Error loading comments:', error);
          this.isLoadingComments = false;
        }
      });
  }

  requestReviewers(): void {
    if (!this.selectedDraft) return;
    
    // Pre-populate with current requested reviewers
    this.selectedReviewerIds = this.selectedDraft.requested_reviewers.map(r => r.id);
    this.showReviewerSelector = true;
  }

  onReviewerSelectionCancelled(): void {
    this.showReviewerSelector = false;
    this.selectedReviewerIds = [];
  }

  onReviewerSelectionConfirmed(reviewerIds: number[]): void {
    if (!this.selectedDraft) return;

    this.reviewService.requestReview(this.selectedDraft.id, reviewerIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedDraft) => {
          // Update the draft properties
          const index = this.drafts.findIndex(d => d.id === this.selectedDraft!.id);
          if (index !== -1) {
            this.drafts[index].requested_reviewers = updatedDraft.requested_reviewers || [];
            this.filteredDrafts = [...this.drafts];
            
            // Update selected draft
            if (this.selectedDraft?.id === updatedDraft.id) {
              this.selectedDraft.requested_reviewers = updatedDraft.requested_reviewers || [];
            }
          }
          this.showReviewerSelector = false;
          this.selectedReviewerIds = [];
        },
        error: (error) => {
          console.error('Error requesting reviewers:', error);
          this.error = 'Failed to request reviewers';
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

  onApprove(): void {
    // My Drafts doesn't support approval - this is just a placeholder
    console.log('Approval not supported in My Drafts');
  }

  publishDraft(draft: ReviewDraft): void {
    if (!canPublish(draft)) {
      return;
    }

    this.reviewService.publishDraft(draft.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedDraft) => {
          // Update the draft properties in the list
          const index = this.drafts.findIndex(d => d.id === draft.id);
          if (index !== -1) {
            // Update properties instead of replacing the whole object
            this.drafts[index].is_published = updatedDraft.is_published || false;
            this.drafts[index].is_approved = updatedDraft.is_approved || false;
            
            // Update filtered drafts
            this.filteredDrafts = [...this.drafts];
            
            // Update selected draft properties if it's the one being published
            if (this.selectedDraft?.id === draft.id) {
              this.selectedDraft.is_published = updatedDraft.is_published || false;
              this.selectedDraft.is_approved = updatedDraft.is_approved || false;
            }
          }
        },
        error: (error) => {
          console.error('Error publishing draft:', error);
          this.error = 'Failed to publish draft';
        }
      });
  }

  onEditRequested(): void {
    // Edit functionality is now handled by the draft-detail-panel component
    // This method is called when the edit button is clicked in the panel
  }

  onEditSaved(): void {
    // Refresh the drafts list to show the new draft
    this.loadMyDrafts();
    
    // Also reload comments
    if (this.selectedDraft) {
      this.loadComments();
    }
  }

  onEditCancelled(): void {
    // Edit cancellation is handled by the draft-detail-panel component
  }
}
