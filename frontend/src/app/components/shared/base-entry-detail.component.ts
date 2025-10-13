import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { Entry, ReviewDraft, EntryDraft, Comment } from '../../models';
import { EntryDetailService } from '../../services/entry-detail.service';
import { PermissionService } from '../../services/permission.service';

@Component({
  template: ''
})
export abstract class BaseEntryDetailComponent implements OnInit, OnDestroy {
  @Input() entry: Entry | ReviewDraft | null = null;
  @Input() canEdit: boolean = false;
  @Input() showVersionHistory: boolean = false;
  @Input() showWorkflowButtons: boolean = false;
  
  @Output() editRequested = new EventEmitter<void>();
  @Output() editSaved = new EventEmitter<Entry>();
  @Output() editCancelled = new EventEmitter<void>();
  @Output() editModeChanged = new EventEmitter<boolean>();
  @Output() commentAdded = new EventEmitter<Comment>();
  @Output() commentResolved = new EventEmitter<Comment>();
  @Output() commentUnresolved = new EventEmitter<Comment>();
  @Output() draftSelected = new EventEmitter<EntryDraft>();

  protected destroy$ = new Subject<void>();

  // State management
  isEditMode: boolean = false;
  editContent: string = '';
  comments: Comment[] = [];
  isLoadingComments: boolean = false;
  draftHistory: EntryDraft[] = [];
  isLoadingDraftHistory: boolean = false;
  selectedHistoricalDraft: EntryDraft | null = null;
  showVersionHistorySidebar: boolean = false;

  constructor(
    protected entryDetailService: EntryDetailService,
    protected permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    if (this.entry) {
      this.loadEntryData();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load all entry-related data
   */
  protected loadEntryData(): void {
    if (!this.entry) return;

    const entryId = this.entryDetailService.getEntryId(this.entry);
    if (!entryId) return;

    this.loadComments(entryId);
    this.loadDraftHistory(entryId);
  }

  /**
   * Load comments for the entry
   */
  protected loadComments(entryId: number): void {
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
  protected loadDraftHistory(entryId: number): void {
    this.isLoadingDraftHistory = true;
    this.entryDetailService.loadDraftHistory(entryId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (drafts) => {
          this.draftHistory = drafts;
          this.isLoadingDraftHistory = false;
        },
        error: (error) => {
          console.error('Error loading draft history:', error);
          this.isLoadingDraftHistory = false;
        }
      });
  }

  /**
   * Handle edit request
   */
  onEditRequested(): void {
    if (!this.entry || !this.canEdit) return;

    this.editContent = this.entryDetailService.initializeEditContent(this.entry);
    this.isEditMode = true;
    this.editRequested.emit();
  }

  /**
   * Handle edit save
   */
  onEditSaved(): void {
    if (!this.entry || !this.editContent.trim()) return;

    const entryId = this.entryDetailService.getEntryId(this.entry);
    if (!entryId) return;

    const currentUser = this.permissionService.currentUser;
    if (!currentUser) return;

    this.entryDetailService.createNewDraft(entryId, this.editContent, currentUser.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newDraft) => {
          this.isEditMode = false;
          this.editContent = '';
          
          // Refresh data
          this.loadEntryData();
          
          // Emit event
          this.editSaved.emit(this.entry as Entry);
        },
        error: (error) => {
          console.error('Error saving draft:', error);
        }
      });
  }

  /**
   * Handle edit cancellation
   */
  onEditCancelled(): void {
    this.isEditMode = false;
    this.editContent = '';
    this.editCancelled.emit();
  }

  /**
   * Handle comment added
   */
  onCommentAdded(comment: Comment): void {
    this.comments = this.entryDetailService.onCommentAdded(this.comments, comment);
    this.commentAdded.emit(comment);
  }

  /**
   * Handle comment resolved
   */
  onCommentResolved(comment: Comment): void {
    this.comments = this.entryDetailService.onCommentResolved(this.comments, comment);
    this.commentResolved.emit(comment);
  }

  /**
   * Handle comment unresolved
   */
  onCommentUnresolved(comment: Comment): void {
    this.comments = this.entryDetailService.onCommentUnresolved(this.comments, comment);
    this.commentUnresolved.emit(comment);
  }

  /**
   * Toggle version history sidebar
   */
  toggleVersionHistory(): void {
    this.showVersionHistorySidebar = !this.showVersionHistorySidebar;
  }

  /**
   * Handle version history sidebar closed
   */
  onVersionHistoryClosed(): void {
    this.showVersionHistorySidebar = false;
  }

  /**
   * Handle draft selection from version history
   */
  onDraftSelected(draft: EntryDraft): void {
    this.selectedHistoricalDraft = draft;
    this.draftSelected.emit(draft);
  }

  /**
   * Clear selected historical draft
   */
  clearSelectedDraft(): void {
    this.selectedHistoricalDraft = null;
  }

  /**
   * Check if entry has unpublished drafts
   */
  hasUnpublishedDrafts(): boolean {
    if (!this.entry) return false;
    return this.entryDetailService.hasUnpublishedDrafts(this.entry);
  }

  /**
   * Get published content
   */
  getPublishedContent(): string {
    if (!this.entry) return '';
    return this.entryDetailService.getPublishedContent(this.entry);
  }

  /**
   * Get latest draft content
   */
  getLatestDraftContent(): string {
    if (!this.entry) return '';
    
    if ('active_draft' in this.entry && this.entry.active_draft) {
      return this.entry.active_draft.content;
    }
    if ('content' in this.entry) {
      return this.entry.content;
    }
    return '';
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.permissionService.currentUser;
  }

  /**
   * Check if user can edit
   */
  canUserEdit(): boolean {
    return this.canEdit && !!this.getCurrentUser();
  }
}