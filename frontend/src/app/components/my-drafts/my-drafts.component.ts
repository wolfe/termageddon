import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ReviewService } from '../../services/review.service';
import { GlossaryService } from '../../services/glossary.service';
import { PermissionService } from '../../services/permission.service';
import { EntryDetailService } from '../../services/entry-detail.service';
import { PanelCommonService, PanelState } from '../../services/panel-common.service';
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
  
  // Use centralized panel state
  state: PanelState;

  constructor(
    private reviewService: ReviewService,
    private glossaryService: GlossaryService,
    private permissionService: PermissionService,
    private entryDetailService: EntryDetailService,
    private panelCommonService: PanelCommonService
  ) {
    this.state = this.panelCommonService.initializePanelState();
  }

  ngOnInit(): void {
    this.state.currentUser = this.permissionService.currentUser;
    this.loadMyDrafts();
    this.panelCommonService.loadUsers(this.state);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMyDrafts(): void {
    this.state.loading = true;
    this.state.error = null;

    this.reviewService.getOwnDrafts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PaginatedResponse<ReviewDraft>) => {
          // Filter to show only the latest draft per entry
          this.state.drafts = this.panelCommonService.getLatestDraftsPerEntry(response.results);
          this.state.filteredDrafts = this.panelCommonService.filterDraftsBySearch(this.state.searchTerm, this.state.drafts);
          // Auto-select first draft if available
          if (this.state.drafts.length > 0 && !this.state.selectedDraft) {
            this.state.selectedDraft = this.state.drafts[0];
          }
          this.state.loading = false;
        },
        error: (error) => {
          console.error('Error loading my drafts:', error);
          this.state.error = 'Failed to load your drafts';
          this.state.loading = false;
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
    if (!this.state.searchTerm.trim()) {
      this.state.filteredDrafts = [...this.state.drafts];
      return;
    }

    // Use backend search instead of client-side filtering
    this.state.loading = true;
    this.reviewService.searchDrafts(this.state.searchTerm, false).subscribe({
      next: (response: PaginatedResponse<ReviewDraft>) => {
        // Filter results to only show own drafts and apply latest-only filtering
        const ownDrafts = response.results.filter(draft => 
          draft.author.id === this.state.currentUser?.id
        );
        this.state.filteredDrafts = this.panelCommonService.getLatestDraftsPerEntry(ownDrafts);
        this.state.loading = false;
        
        // If current selection is not in filtered results, select first available
        if (this.state.selectedDraft && !this.state.filteredDrafts.find(d => d.id === this.state.selectedDraft!.id)) {
          this.state.selectedDraft = this.state.filteredDrafts.length > 0 ? this.state.filteredDrafts[0] : null;
        }
      },
      error: (error) => {
        console.error('Error searching drafts:', error);
        this.state.error = 'Failed to search drafts';
        this.state.loading = false;
      },
    });
  }

  selectDraft(draft: ReviewDraft): void {
    this.panelCommonService.selectDraft(draft, this.state);
  }

  loadUsers(): void {
    this.panelCommonService.loadUsers(this.state);
  }

  loadComments(): void {
    if (!this.state.selectedDraft?.entry?.id) return;
    
    this.state.isLoadingComments = true;
    this.entryDetailService.loadCommentsWithPositions(this.state.selectedDraft.entry.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (comments) => {
          this.state.comments = comments;
          this.state.isLoadingComments = false;
        },
        error: (error) => {
          console.error('Error loading comments:', error);
          this.state.isLoadingComments = false;
        }
      });
  }

  requestReviewers(): void {
    if (!this.state.selectedDraft) return;
    
    // Pre-populate with current requested reviewers
    this.state.selectedReviewerIds = this.state.selectedDraft.requested_reviewers.map(r => r.id);
    this.state.showReviewerSelector = true;
  }

  onReviewerSelectionCancelled(): void {
    this.state.showReviewerSelector = false;
    this.state.selectedReviewerIds = [];
  }

  onReviewerSelectionConfirmed(reviewerIds: number[]): void {
    if (!this.state.selectedDraft) return;

    this.reviewService.requestReview(this.state.selectedDraft.id, reviewerIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedDraft) => {
          // Update the draft properties
          const index = this.state.drafts.findIndex(d => d.id === this.state.selectedDraft!.id);
          if (index !== -1) {
            this.state.drafts[index].requested_reviewers = updatedDraft.requested_reviewers || [];
            this.state.filteredDrafts = [...this.state.drafts];
            
            // Update selected draft
            if (this.state.selectedDraft?.id === updatedDraft.id) {
              this.state.selectedDraft.requested_reviewers = updatedDraft.requested_reviewers || [];
            }
          }
          this.state.showReviewerSelector = false;
          this.state.selectedReviewerIds = [];
        },
        error: (error) => {
          console.error('Error requesting reviewers:', error);
          this.state.error = 'Failed to request reviewers';
        }
      });
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
          const index = this.state.drafts.findIndex(d => d.id === draft.id);
          if (index !== -1) {
            // Update properties instead of replacing the whole object
            this.state.drafts[index].is_published = updatedDraft.is_published || false;
            this.state.drafts[index].is_approved = updatedDraft.is_approved || false;
            
            // Update filtered drafts
            this.state.filteredDrafts = [...this.state.drafts];
            
            // Update selected draft properties if it's the one being published
            if (this.state.selectedDraft?.id === draft.id) {
              this.state.selectedDraft.is_published = updatedDraft.is_published || false;
              this.state.selectedDraft.is_approved = updatedDraft.is_approved || false;
            }
          }
        },
        error: (error) => {
          console.error('Error publishing draft:', error);
          this.state.error = 'Failed to publish draft';
        }
      });
  }

  onEditRequested(): void {
    // Edit functionality is now handled by the draft-detail-panel component
    // This method is called when the edit button is clicked in the panel
  }

  onEditSaved(): void {
    this.panelCommonService.onEditSaved(this.state, () => {
      this.loadMyDrafts();
    });
  }

  onEditCancelled(): void {
    // Edit cancellation is handled by the draft-detail-panel component
  }
}
