import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Entry, EntryDraft, ReviewDraft, Comment, User } from '../../models';
import { EntryDetailService } from '../../services/entry-detail.service';
import { PermissionService } from '../../services/permission.service';
import { NotificationService } from '../../services/notification.service';

export abstract class BaseEntryDetailComponent implements OnInit, OnDestroy {
  protected destroy$ = new Subject<void>();

  // Shared state
  isEditMode: boolean = false;
  editContent: string = '';
  comments: Comment[] = [];
  isLoadingComments: boolean = false;
  draftHistory: EntryDraft[] = [];
  latestDraft: EntryDraft | null = null;
  isLoadingDraftHistory: boolean = false;
  showVersionHistory: boolean = false;
  selectedHistoricalDraft: EntryDraft | null = null;

  constructor(
    protected entryDetailService: EntryDetailService,
    protected permissionService: PermissionService,
    protected notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadComments();
    this.loadDraftHistory();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Abstract method to get the entry ID - must be implemented by subclasses
   */
  protected abstract getEntryId(): number;

  /**
   * Abstract method to get the entry or review draft - must be implemented by subclasses
   */
  protected abstract getEntryOrDraft(): Entry | ReviewDraft;

  /**
   * Load comments for the entry
   */
  loadComments(): void {
    const entryId = this.getEntryId();
    if (!entryId) return;
    
    this.isLoadingComments = true;
    this.entryDetailService.loadCommentsWithPositions(entryId)
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

  /**
   * Load draft history for the entry
   */
  loadDraftHistory(): void {
    const entryId = this.getEntryId();
    if (!entryId) return;
    
    this.isLoadingDraftHistory = true;
    this.entryDetailService.loadDraftHistory(entryId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (drafts) => {
          this.draftHistory = drafts;
          this.latestDraft = drafts.length > 0 ? drafts[0] : null;
          this.isLoadingDraftHistory = false;
        },
        error: (error) => {
          console.error('Error loading draft history:', error);
          this.isLoadingDraftHistory = false;
        }
      });
  }

  /**
   * Handle edit click - initialize edit content
   */
  onEditClick(): void {
    const entryOrDraft = this.getEntryOrDraft();
    this.editContent = this.entryDetailService.initializeEditContent(entryOrDraft);
    this.isEditMode = true;
  }

  /**
   * Handle save edit - create new draft
   */
  onSaveEdit(): void {
    if (!this.permissionService.currentUser) {
      this.notificationService.error('You must be logged in to save definitions.');
      return;
    }

    const entryId = this.getEntryId();
    if (!entryId) return;

    this.entryDetailService.createNewDraft(
      entryId,
      this.editContent,
      this.permissionService.currentUser.id
    ).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (newDraft) => {
        console.log('Successfully created draft:', newDraft);
        this.loadDraftHistory();
        this.refreshEntryData();
        this.isEditMode = false;
        this.editContent = '';
      },
      error: (error) => {
        console.error('Failed to create draft:', error);
        this.handleSaveError(error);
      }
    });
  }

  /**
   * Handle cancel edit
   */
  onCancelEdit(): void {
    this.isEditMode = false;
    this.editContent = '';
  }

  /**
   * Handle comment added
   */
  onCommentAdded(comment: Comment): void {
    this.comments = this.entryDetailService.onCommentAdded(this.comments, comment);
  }

  /**
   * Handle comment resolved
   */
  onCommentResolved(comment: Comment): void {
    this.comments = this.entryDetailService.onCommentResolved(this.comments, comment);
  }

  /**
   * Handle comment unresolved
   */
  onCommentUnresolved(comment: Comment): void {
    this.comments = this.entryDetailService.onCommentUnresolved(this.comments, comment);
  }

  /**
   * Toggle version history sidebar
   */
  toggleVersionHistory(): void {
    this.showVersionHistory = !this.showVersionHistory;
  }

  /**
   * Handle version history closed
   */
  onVersionHistoryClosed(): void {
    this.showVersionHistory = false;
  }

  /**
   * Handle draft selected from version history
   */
  onDraftSelected(draft: EntryDraft): void {
    this.selectedHistoricalDraft = draft;
    console.log('Selected draft:', draft);
  }

  /**
   * Check if entry has unpublished drafts
   */
  hasUnpublishedDrafts(): boolean {
    return this.entryDetailService.hasUnpublishedDrafts(this.draftHistory);
  }

  /**
   * Get published draft
   */
  getPublishedDraft(): EntryDraft | null {
    return this.entryDetailService.getPublishedDraftFromHistory(this.draftHistory);
  }

  /**
   * Get latest draft content
   */
  getLatestDraftContent(): string {
    const entryOrDraft = this.getEntryOrDraft();
    return this.entryDetailService.getLatestDraftContent(this.draftHistory, 'entry' in entryOrDraft ? undefined : entryOrDraft);
  }

  /**
   * Get published content
   */
  getPublishedContent(): string {
    return this.entryDetailService.getPublishedContent(this.draftHistory);
  }

  /**
   * Abstract method to refresh entry data - must be implemented by subclasses
   */
  protected abstract refreshEntryData(): void;

  /**
   * Handle save error
   */
  private handleSaveError(error: any): void {
    let errorMessage = 'Failed to save definition. Please try again.';

    if (error.status === 400) {
      if (error.error?.detail) {
        errorMessage = error.error.detail;
      } else if (error.error?.content) {
        errorMessage = error.error.content[0];
      } else {
        errorMessage = 'Invalid data provided. Please check your input and try again.';
      }
    } else if (error.status === 403) {
      errorMessage = 'You do not have permission to save definitions.';
    } else if (error.status === 500) {
      errorMessage = 'Server error occurred. Please contact support.';
    }

    this.notificationService.error(errorMessage);
  }
}
