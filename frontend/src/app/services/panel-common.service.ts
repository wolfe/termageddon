import { Injectable } from '@angular/core';
import { Observable, of, Subject, takeUntil } from 'rxjs';
import { ReviewDraft, Comment, User, PaginatedResponse, EntryDraft } from '../models';
import { ReviewService } from './review.service';
import { GlossaryService } from './glossary.service';
import { EntryDetailService } from './entry-detail.service';
import { PermissionService } from './permission.service';
import { NotificationService } from './notification.service';

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
   * Handle search
   */
  onSearch(searchTerm: string, state: PanelState, loadDraftsCallback: () => void): void {
    state.searchTerm = searchTerm;
    loadDraftsCallback();
  }

  /**
   * Clear search
   */
  clearSearch(state: PanelState, loadDraftsCallback: () => void): void {
    state.searchTerm = '';
    loadDraftsCallback();
  }

  /**
   * Cleanup subscriptions
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
