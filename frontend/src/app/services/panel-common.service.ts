import { Injectable } from '@angular/core';
import { Observable, of, Subject, takeUntil } from 'rxjs';
import { ReviewDraft, Comment, User, PaginatedResponse, EntryDraft } from '../models';
import { ReviewService } from './review.service';
import { GlossaryService } from './glossary.service';
import { EntryDetailService } from './entry-detail.service';
import { PermissionService } from './permission.service';
import { NotificationService } from './notification.service';
import { canPublish } from '../utils/draft-status.util';

export interface PanelState {
  // Common state
  loading: boolean;
  error: string | null;
  currentUser: User | null;
  searchTerm: string;
  
  // Draft state
  drafts: ReviewDraft[];
  filteredDrafts: ReviewDraft[];
  selectedDraft: ReviewDraft | null;
  
  // Comment state
  comments: Comment[];
  isLoadingComments: boolean;
  
  // Reviewer selection state
  showReviewerSelector: boolean;
  allUsers: User[];
  selectedReviewerIds: number[];
  draftToRequestReview: ReviewDraft | null;
  requestingReview: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PanelCommonService {
  private destroy$ = new Subject<void>();

  constructor(
    private reviewService: ReviewService,
    private glossaryService: GlossaryService,
    private entryDetailService: EntryDetailService,
    private permissionService: PermissionService,
    private notificationService: NotificationService
  ) {}

  /**
   * Initialize common panel state
   */
  initializePanelState(): PanelState {
    return {
      loading: false,
      error: null,
      currentUser: this.permissionService.currentUser,
      searchTerm: '',
      drafts: [],
      filteredDrafts: [],
      selectedDraft: null,
      comments: [],
      isLoadingComments: false,
      showReviewerSelector: false,
      allUsers: [],
      selectedReviewerIds: [],
      draftToRequestReview: null,
      requestingReview: false
    };
  }

  /**
   * Load comments for a selected draft
   */
  loadComments(entryId: number, state: PanelState): Observable<Comment[]> {
    if (!entryId) return of([]);
    
    state.isLoadingComments = true;
    return this.entryDetailService.loadCommentsWithPositions(entryId)
      .pipe(takeUntil(this.destroy$));
  }

  /**
   * Handle comment loading success
   */
  onCommentsLoaded(comments: Comment[], state: PanelState): void {
    state.comments = comments;
    state.isLoadingComments = false;
  }

  /**
   * Handle comment loading error
   */
  onCommentsError(error: any, state: PanelState): void {
    console.error('Error loading comments:', error);
    state.isLoadingComments = false;
  }

  /**
   * Select a draft and load its comments
   */
  selectDraft(draft: ReviewDraft, state: PanelState): void {
    state.selectedDraft = draft;
    if (draft.entry?.id) {
      this.loadComments(draft.entry.id, state).subscribe({
        next: (comments) => this.onCommentsLoaded(comments, state),
        error: (error) => this.onCommentsError(error, state)
      });
    }
  }

  /**
   * Handle edit saved - refresh comments and drafts
   */
  onEditSaved(state: PanelState, loadDraftsCallback: () => void): void {
    // Refresh comments
    if (state.selectedDraft?.entry?.id) {
      this.loadComments(state.selectedDraft.entry.id, state).subscribe({
        next: (comments) => this.onCommentsLoaded(comments, state),
        error: (error) => this.onCommentsError(error, state)
      });
    }
    
    // Refresh drafts
    loadDraftsCallback();
  }

  /**
   * Handle comment added
   */
  onCommentAdded(comment: Comment, state: PanelState): void {
    state.comments = this.entryDetailService.onCommentAdded(state.comments, comment);
  }

  /**
   * Handle comment resolved
   */
  onCommentResolved(comment: Comment, state: PanelState): void {
    state.comments = this.entryDetailService.onCommentResolved(state.comments, comment);
  }

  /**
   * Handle comment unresolved
   */
  onCommentUnresolved(comment: Comment, state: PanelState): void {
    state.comments = this.entryDetailService.onCommentUnresolved(state.comments, comment);
  }

  /**
   * Load all users for reviewer selection
   */
  loadUsers(state: PanelState): void {
    this.glossaryService.getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users) => {
          state.allUsers = users;
        },
        error: (error) => {
          console.error('Error loading users:', error);
        }
      });
  }

  /**
   * Show reviewer selector dialog
   */
  showReviewerSelectorDialog(draft: ReviewDraft, state: PanelState): void {
    state.draftToRequestReview = draft;
    state.showReviewerSelector = true;
    state.selectedReviewerIds = [];
  }

  /**
   * Cancel reviewer selection
   */
  cancelReviewerSelection(state: PanelState): void {
    state.showReviewerSelector = false;
    state.draftToRequestReview = null;
    state.selectedReviewerIds = [];
  }

  /**
   * Confirm reviewer selection
   */
  confirmReviewerSelection(reviewerIds: number[], state: PanelState): void {
    if (!state.draftToRequestReview) return;
    
    state.requestingReview = true;
    this.reviewService.requestReview(state.draftToRequestReview.id, reviewerIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.success('Review requests sent successfully!');
          state.requestingReview = false;
          this.cancelReviewerSelection(state);
        },
        error: (error) => {
          console.error('Error requesting review:', error);
          this.notificationService.error('Failed to send review requests');
          state.requestingReview = false;
        }
      });
  }

  /**
   * Filter drafts by search term
   */
  filterDraftsBySearch(searchTerm: string, drafts: ReviewDraft[]): ReviewDraft[] {
    if (!searchTerm.trim()) {
      return drafts;
    }
    
    const term = searchTerm.toLowerCase();
    return drafts.filter(draft => 
      draft.entry.term.text.toLowerCase().includes(term) ||
      draft.content.toLowerCase().includes(term) ||
      draft.entry.perspective.name.toLowerCase().includes(term)
    );
  }

  /**
   * Get latest drafts per entry (for My Drafts)
   */
  getLatestDraftsPerEntry(drafts: ReviewDraft[]): ReviewDraft[] {
    const latestByEntry = new Map<number, ReviewDraft>();
    
    drafts.forEach(draft => {
      const entryId = draft.entry.id;
      const existing = latestByEntry.get(entryId);
      
      if (!existing || new Date(draft.timestamp) > new Date(existing.timestamp)) {
        latestByEntry.set(entryId, draft);
      }
    });
    
    return Array.from(latestByEntry.values()).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Handle search with custom backend function
   */
  onSearch(searchTerm: string, state: PanelState, searchFn: (term: string) => Observable<PaginatedResponse<ReviewDraft>>): void {
    state.searchTerm = searchTerm;
    
    if (!searchTerm.trim()) {
      state.filteredDrafts = [...state.drafts];
      return;
    }

    // Use backend search
    state.loading = true;
    searchFn(searchTerm)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PaginatedResponse<ReviewDraft>) => {
          state.filteredDrafts = response.results;
          state.loading = false;
          
          // If current selection is not in filtered results, select first available
          if (state.selectedDraft && !state.filteredDrafts.find(d => d.id === state.selectedDraft!.id)) {
            state.selectedDraft = state.filteredDrafts.length > 0 ? state.filteredDrafts[0] : null;
          }
        },
        error: (error) => {
          console.error('Error searching drafts:', error);
          state.error = 'Failed to search drafts';
          state.loading = false;
        },
      });
  }

  /**
   * Publish draft with refresh callback
   */
  publishDraft(draft: ReviewDraft, state: PanelState, refreshCallback: () => void): void {
    if (!canPublish(draft)) {
      return;
    }

    this.reviewService.publishDraft(draft.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedDraft) => {
          this.notificationService.success('Draft published successfully!');
          
          // Update the draft properties in the list
          const index = state.drafts.findIndex(d => d.id === draft.id);
          if (index !== -1) {
            // Update properties instead of replacing the whole object
            state.drafts[index].is_published = updatedDraft.is_published || false;
            state.drafts[index].is_approved = updatedDraft.is_approved || false;
            
            // Update filtered drafts
            state.filteredDrafts = [...state.drafts];
            
            // Update selected draft properties if it's the one being published
            if (state.selectedDraft?.id === draft.id) {
              state.selectedDraft.is_published = updatedDraft.is_published || false;
              state.selectedDraft.is_approved = updatedDraft.is_approved || false;
            }
          }
          
          // Call refresh callback for additional cleanup
          refreshCallback();
        },
        error: (error) => {
          console.error('Error publishing draft:', error);
          this.notificationService.error('Failed to publish draft');
        }
      });
  }

  /**
   * Request review for a draft
   */
  requestReview(draftId: number, reviewerIds: number[], state: PanelState, refreshCallback?: () => void): void {
    state.requestingReview = true;
    this.reviewService.requestReview(draftId, reviewerIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedDraft) => {
          this.notificationService.success('Review requests sent successfully!');
          
          // Update the draft properties in the list
          const index = state.drafts.findIndex(d => d.id === draftId);
          if (index !== -1) {
            state.drafts[index].requested_reviewers = updatedDraft.requested_reviewers || [];
            state.filteredDrafts = [...state.drafts];
            
            // Update selected draft
            if (state.selectedDraft?.id === draftId) {
              state.selectedDraft.requested_reviewers = updatedDraft.requested_reviewers || [];
            }
          }
          
          state.requestingReview = false;
          this.hideReviewerSelector(state);
          
          // Call refresh callback if provided
          if (refreshCallback) {
            refreshCallback();
          }
        },
        error: (error) => {
          console.error('Error requesting review:', error);
          this.notificationService.error('Failed to send review requests');
          state.requestingReview = false;
        }
      });
  }

  /**
   * Show reviewer selector dialog
   */
  showReviewerSelector(draft: ReviewDraft, state: PanelState): void {
    state.draftToRequestReview = draft;
    state.showReviewerSelector = true;
    state.selectedReviewerIds = draft.requested_reviewers.map(r => r.id);
  }

  /**
   * Hide reviewer selector dialog
   */
  hideReviewerSelector(state: PanelState): void {
    state.showReviewerSelector = false;
    state.draftToRequestReview = null;
    state.selectedReviewerIds = [];
  }

  /**
   * Generic draft loading with post-processing
   */
  loadDrafts(loadFn: () => Observable<PaginatedResponse<ReviewDraft>>, state: PanelState, postProcessFn?: (drafts: ReviewDraft[]) => ReviewDraft[]): void {
    state.loading = true;
    state.error = null;

    loadFn()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PaginatedResponse<ReviewDraft>) => {
          state.drafts = postProcessFn ? postProcessFn(response.results) : response.results;
          state.filteredDrafts = this.filterDraftsBySearch(state.searchTerm, state.drafts);
          state.loading = false;
        },
        error: (error) => {
          console.error('Error loading drafts:', error);
          state.error = 'Failed to load drafts';
          state.loading = false;
        },
      });
  }

  /**
   * Centralize post-edit refresh logic
   */
  refreshAfterEdit(state: PanelState, loadDraftsCallback: () => void): void {
    // Refresh comments
    if (state.selectedDraft?.entry?.id) {
      this.loadComments(state.selectedDraft.entry.id, state).subscribe({
        next: (comments) => this.onCommentsLoaded(comments, state),
        error: (error) => this.onCommentsError(error, state)
      });
    }
    
    // Refresh drafts
    loadDraftsCallback();
  }

  /**
   * Handle post-approval list updates
   */
  refreshAfterApproval(draftId: number, state: PanelState): void {
    // Remove the approved draft from our list
    state.drafts = state.drafts.filter(d => d.id !== draftId);
    state.filteredDrafts = state.filteredDrafts.filter(d => d.id !== draftId);

    // Deselect the draft
    state.selectedDraft = null;
  }

  /**
   * Approve draft (Review-specific)
   */
  approveDraft(draft: ReviewDraft, state: PanelState, successCallback: () => void): void {
    state.loading = true;

    this.reviewService.approveDraft(draft.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedDraft) => {
          this.notificationService.success(
            `Successfully approved "${draft.entry.term.text}"`,
          );

          // Use centralized refresh logic
          this.refreshAfterApproval(draft.id, state);
          state.loading = false;
          
          // Call success callback
          successCallback();
        },
        error: (error) => {
          console.error('Error approving draft:', error);
          this.notificationService.error('Failed to approve draft. Please try again.');
          state.loading = false;
        },
      });
  }

  /**
   * Cleanup subscriptions
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
