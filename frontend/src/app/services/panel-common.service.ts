import { Injectable, OnDestroy } from '@angular/core';
import { Observable, of, Subject, takeUntil, switchMap } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { ReviewDraft, Comment, User, PaginatedResponse, EntryDraft } from '../models';
import { UnifiedDraftService, DraftLoadOptions, DraftActionOptions } from './unified-draft.service';
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
  
  // New entry state
  isNewEntryMode: boolean;
  newEntryId: number | null;
  newEntry: any | null; // Will be Entry type when imported
}

@Injectable({
  providedIn: 'root'
})
export class PanelCommonService implements OnDestroy {
  private destroy$ = new Subject<void>();
  private searchSubjects = new Map<PanelState, Subject<{ searchTerm: string; options: DraftLoadOptions }>>();

  constructor(
    private unifiedDraftService: UnifiedDraftService,
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
      requestingReview: false,
      isNewEntryMode: false,
      newEntryId: null,
      newEntry: null
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
    this.unifiedDraftService.getUsers()
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
    this.unifiedDraftService.requestReview(state.draftToRequestReview.id, reviewerIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const termName = state.draftToRequestReview?.entry?.term?.text || 'draft';
          this.notificationService.success(`Review requests for "${termName}" sent successfully!`);
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
   * Handle search with unified draft service and request cancellation
   */
  onSearch(searchTerm: string, state: PanelState, options: DraftLoadOptions = {}): void {
    state.searchTerm = searchTerm;
    
    if (!searchTerm.trim()) {
      state.filteredDrafts = [...state.drafts];
      return;
    }

    // Get or create search subject for this state
    if (!this.searchSubjects.has(state)) {
      const searchSubject = new Subject<{ searchTerm: string; options: DraftLoadOptions }>();
      
      // Set up the search stream with request cancellation
      searchSubject
        .pipe(
          switchMap(({ searchTerm, options }) => {
            // This will cancel the previous request when a new one starts
            return this.unifiedDraftService.loadDrafts({ ...options, searchTerm });
          }),
          takeUntil(this.destroy$)
        )
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
      
      this.searchSubjects.set(state, searchSubject);
    }

    // Trigger the search
    state.loading = true;
    this.searchSubjects.get(state)!.next({ searchTerm, options });
  }

  /**
   * Publish draft with refresh callback
   */
  publishDraft(draft: ReviewDraft, state: PanelState, refreshCallback: () => void): void {
    if (!canPublish(draft)) {
      return;
    }

    this.unifiedDraftService.publishDraft(draft.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedDraft) => {
          this.notificationService.success(`Draft for "${draft.entry.term.text}" published successfully!`);
          
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
    
    // Find the draft to get term name
    const draft = state.drafts.find(d => d.id === draftId);
    const termName = draft?.entry?.term?.text || 'draft';
    
    this.unifiedDraftService.requestReview(draftId, reviewerIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedDraft) => {
          this.notificationService.success(`Review requests for "${termName}" sent successfully!`);
          
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
   * Generic draft loading with unified service and centralized selection preservation
   */
  loadDrafts(options: DraftLoadOptions = {}, state: PanelState, route: ActivatedRoute, postProcessFn?: (drafts: ReviewDraft[]) => ReviewDraft[]): void {
    state.loading = true;
    state.error = null;

    // Store current selection before loading
    const currentSelectedDraftId = state.selectedDraft?.id;

    this.unifiedDraftService.loadDrafts(options)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PaginatedResponse<ReviewDraft>) => {
          state.drafts = postProcessFn ? postProcessFn(response.results) : response.results;
          state.filteredDrafts = [...state.drafts];
          state.loading = false;
          
          // Apply centralized selection preservation logic
          this.preserveSelectionAfterLoad(state, currentSelectedDraftId, route);
        },
        error: (error) => {
          console.error('Error loading drafts:', error);
          state.error = 'Failed to load drafts';
          state.loading = false;
        },
      });
  }

  /**
   * Centralized selection preservation logic
   */
  private preserveSelectionAfterLoad(state: PanelState, currentSelectedDraftId: number | undefined, route: ActivatedRoute): void {
    // Check if we have a specific draftId in URL that we should preserve
    const urlParams = route.snapshot.queryParams;
    const urlDraftId = urlParams['draftId'] ? +urlParams['draftId'] : null;
    
    if (currentSelectedDraftId && state.drafts.length > 0) {
      const stillExists = state.drafts.some(draft => draft.id === currentSelectedDraftId);
      if (stillExists) {
        // Keep the current selection
        state.selectedDraft = state.drafts.find(draft => draft.id === currentSelectedDraftId) || null;
      } else if (urlDraftId && currentSelectedDraftId === urlDraftId) {
        // The specific draft from URL is not in the filtered results
        // This can happen when filters exclude it - keep the selection anyway
        // The draft was already loaded by loadDraftById, so keep it selected
        // Don't change the selection
      } else {
        // Current selection no longer exists and it's not the URL draft - clear selection
        state.selectedDraft = null;
      }
    } else if (state.drafts.length > 0 && !state.selectedDraft && urlDraftId) {
      // No previous selection but we have a specific draftId in URL - don't auto-select
      // The loadDraftById will handle the selection
    } else if (state.drafts.length > 0 && !state.selectedDraft && !urlDraftId) {
      // No previous selection and no specific draftId - auto-select first draft
      state.selectedDraft = state.drafts[0];
    }
  }

  /**
   * Check if URL has parameters that indicate specific selection intent
   */
  hasRelevantUrlParams(route: ActivatedRoute): boolean {
    const params = route.snapshot.queryParams;
    return !!(params['draftId'] || params['entryId'] || params['edit']);
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

    this.unifiedDraftService.approveDraft(draft.id)
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
    
    // Clean up search subjects
    this.searchSubjects.forEach(subject => {
      subject.complete();
    });
    this.searchSubjects.clear();
  }
}
