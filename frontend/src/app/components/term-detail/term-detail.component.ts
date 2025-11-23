import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  OnChanges,
  SimpleChanges,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { Entry, Comment, EntryDraft } from '../../models';
import { PermissionService } from '../../services/permission.service';
import { GlossaryService } from '../../services/glossary.service';
import { NotificationService } from '../../services/notification.service';
import { EntryDetailService } from '../../services/entry-detail.service';
import { NavigationService } from '../../services/navigation.service';
import { DefinitionFormComponent } from '../definition-form/definition-form.component';
import { CommentThreadComponent } from '../comment-thread/comment-thread.component';
import { UserAvatarComponent } from '../shared/user-avatar/user-avatar.component';
import { PerspectivePillComponent } from '../shared/perspective-pill/perspective-pill.component';
import { VersionHistorySidebarComponent } from '../shared/version-history-sidebar/version-history-sidebar.component';
import { getInitialsFromName, getUserDisplayName } from '../../utils/user.util';

@Component({
  selector: 'app-term-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DefinitionFormComponent,
    CommentThreadComponent,
    UserAvatarComponent,
    PerspectivePillComponent,
    VersionHistorySidebarComponent,
  ],
  templateUrl: './term-detail.component.html',
  styleUrl: './term-detail.component.scss',
})
export class TermDetailComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input() entry!: Entry;
  @Input() termEntries: Entry[] = [];
  @Input() isEditMode: boolean = false;
  @Output() editRequested = new EventEmitter<void>();
  @Output() editCancelled = new EventEmitter<void>();
  @Output() editSaved = new EventEmitter<Entry>();

  @ViewChild('contentContainer') contentContainer?: ElementRef;

  editContent: string = '';
  comments: Comment[] = [];
  isLoadingComments: boolean = false;
  hasNextCommentsPage: boolean = false;
  commentsNextPage: string | null = null;
  draftHistory: EntryDraft[] = []; // Initialize to empty array to prevent undefined errors
  latestDraft: EntryDraft | null = null;
  isLoadingDraftHistory: boolean = false;
  hasNextDraftHistoryPage: boolean = false;
  draftHistoryNextPage: string | null = null;
  showVersionHistory: boolean = false;
  selectedHistoricalDraft: EntryDraft | null = null;
  private shouldLoadEntries: boolean = true;
  private destroy$ = new Subject<void>();
  private commentsLoadedForEntryId: number | null = null;
  private commentsLoadedForDraftId: number | null = null;

  constructor(
    public sanitizer: DomSanitizer,
    public permissionService: PermissionService,
    private glossaryService: GlossaryService,
    private notificationService: NotificationService,
    private entryDetailService: EntryDetailService,
    private navigationService: NavigationService
  ) {}

  ngOnInit(): void {
    // Only load comments and draft history if entry is already available
    // Otherwise, ngOnChanges will handle it when entry is set
    if (this.entry?.id) {
      this.loadComments();
      this.loadDraftHistory();
    }
    // Only load entries if we don't have any termEntries provided by parent
    if (this.entry && this.termEntries.length === 0 && this.shouldLoadEntries) {
      this.loadAllEntriesForTerm();
    }
  }

  ngAfterViewInit(): void {
    this.setupEntryLinkHandlers();
    // Fallback: ensure comments are loaded if entry is available but comments weren't loaded yet
    // This handles cases where entry was set before ngOnInit or ngOnChanges didn't fire
    // Use setTimeout to ensure this runs after all change detection cycles
    setTimeout(() => {
      if (this.entry?.id && this.commentsLoadedForEntryId !== this.entry.id && !this.isLoadingComments) {
        this.loadComments();
        this.loadDraftHistory();
      }
    }, 0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // When termEntries changes, update the selected entry to the first one if needed
    if (changes['termEntries']) {
      if (this.termEntries.length > 0) {
        // If the current entry is not in the new termEntries, switch to the first one
        const currentEntryInNewTerm = this.termEntries.find(e => e.id === this.entry?.id);
        if (!currentEntryInNewTerm) {
          this.entry = this.termEntries[0];
          this.loadComments();
          this.loadDraftHistory();
        }
        // If parent provided termEntries, don't load our own
        this.shouldLoadEntries = false;
      } else {
        // If termEntries is empty, we can load our own
        this.shouldLoadEntries = true;
      }
    }

    // When entry changes (including initial set), load comments and draft history
    if (changes['entry']) {
      const entryChange = changes['entry'];
      // Load comments and draft history if entry is now available
      // This handles both initial set and subsequent changes
      if (this.entry?.id) {
        // Always load on first change or when entry ID actually changes
        if (entryChange.isFirstChange() || entryChange.previousValue?.id !== this.entry.id) {
          this.loadComments();
          this.loadDraftHistory();
        }
      }
      // Only load entries if we don't have any termEntries provided by parent
      if (this.entry && this.termEntries.length === 0 && this.shouldLoadEntries) {
        this.loadAllEntriesForTerm();
      }
    }

    // When isEditMode changes to true, automatically initialize edit content
    if (changes['isEditMode'] && this.isEditMode && this.entry) {
      this.initializeEditContent();
    }

    // After processing all changes, ensure comments are loaded if entry is available
    // This is a safety net in case entry was set but ngOnChanges didn't fire properly
    if (this.entry?.id && this.commentsLoadedForEntryId !== this.entry.id && !this.isLoadingComments) {
      // Use setTimeout to ensure this runs after all change detection
      setTimeout(() => {
        if (this.entry?.id && this.commentsLoadedForEntryId !== this.entry.id && !this.isLoadingComments) {
          this.loadComments();
          this.loadDraftHistory();
        }
      }, 0);
    }
  }

  loadComments(): void {
    if (!this.entry?.id) return;

    // Don't reload if we're already loading
    if (this.isLoadingComments) {
      return;
    }

    // Determine which draft ID to use (historical draft if selected, otherwise undefined)
    const draftId = this.selectedHistoricalDraft?.id;

    // Don't reload if we've already loaded comments for this entry and draft combination
    if (this.commentsLoadedForEntryId === this.entry.id && this.commentsLoadedForDraftId === (draftId || null)) {
      return;
    }

    this.isLoadingComments = true;
    // Pass the selected historical draft ID if viewing version history
    const showResolved = this.showVersionHistory ? true : false;
    // Use EntryDetailService instead of direct glossaryService call
    this.entryDetailService.loadCommentsWithPositions(this.entry.id, undefined, draftId, showResolved).subscribe({
      next: response => {
        this.comments = response.results;
        this.commentsLoadedForEntryId = this.entry.id;
        this.commentsLoadedForDraftId = draftId || null;
        this.hasNextCommentsPage = !!response.next;
        this.commentsNextPage = response.next;
        this.isLoadingComments = false;
      },
      error: error => {
        console.error('Error loading comments:', error);
        this.isLoadingComments = false;
        // Don't set commentsLoadedForEntryId on error so we can retry
      },
    });
  }

  loadDraftHistory(): void {
    if (!this.entry?.id) return;

    this.isLoadingDraftHistory = true;
    // Use EntryDetailService instead of direct glossaryService call
    this.entryDetailService.loadDraftHistory(this.entry.id).subscribe({
      next: response => {
        this.draftHistory = response.results;
        // Set the latest draft (first in the list since it's ordered by created_at desc)
        this.latestDraft = response.results.length > 0 ? response.results[0] : null;
        this.hasNextDraftHistoryPage = !!response.next;
        this.draftHistoryNextPage = response.next;
        this.isLoadingDraftHistory = false;
      },
      error: error => {
        console.error('Error loading draft history:', error);
        this.isLoadingDraftHistory = false;
      },
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

  get sanitizedContent(): SafeHtml {
    if (this.entry?.active_draft?.content) {
      return this.sanitizer.bypassSecurityTrustHtml(this.entry.active_draft.content);
    }
    return '';
  }

  onEditClick(): void {
    this.initializeEditContent();
    this.editRequested.emit();
  }

  private initializeEditContent(): void {
    // Use unified edit initialization method
    this.editContent = this.entryDetailService.initializeEditContentFromLatest(
      this.draftHistory,
      this.entry?.active_draft?.content || ''
    );
  }

  onSaveEdit(): void {
    if (!this.permissionService.currentUser) {
      this.notificationService.error('You must be logged in to save definitions.');
      return;
    }

    // Always create a new draft (linear draft history)
    this.createNewDraft();
  }

  private createNewDraft(): void {
    const entryId = this.entry.id;
    const content = this.editContent.trim();

    // Use EntryDetailService instead of direct glossaryService call
    this.entryDetailService
      .createNewDraft(entryId, content, this.permissionService.currentUser?.id || 0)
      .subscribe({
        next: newDraft => {
          // Use unified refresh pattern
          this.entryDetailService.refreshAfterDraftCreated(entryId).subscribe({
            next: (response: { draftHistory: EntryDraft[]; entry: Entry }) => {
              this.draftHistory = response.draftHistory;
              this.latestDraft = response.draftHistory[0] || null;
              if (response.entry) {
                Object.assign(this.entry, response.entry);
              }
              this.editSaved.emit(this.entry);
              this.notificationService.success(
                `Definition for "${this.entry.term.text}" saved successfully! It will be visible once approved.`
              );
            },
            error: (error: any) => {
              console.error('Failed to refresh:', error);
              // Still emit success, just log the error
              this.editSaved.emit(this.entry);
              this.notificationService.success(
                `Definition for "${this.entry.term.text}" saved successfully! It will be visible once approved.`
              );
            },
          });
        },
        error: error => {
          console.error('Failed to create draft:', error);
          this.handleSaveError(error);
        },
      });
  }

  private handleSaveError(error: any): void {
    // Show specific error message based on the type of error
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
    // Note: Don't emit editSaved on error, so we stay in edit mode
  }

  onCancelEdit(): void {
    this.editContent = '';
    this.editCancelled.emit();
  }

  canEndorse(): boolean {
    return this.permissionService.canMarkOfficial(this.entry.perspective.id);
  }

  getEndorseTooltip(): string {
    if (!this.canEndorse()) {
      return 'Only perspective curators can endorse';
    }
    if (this.entry.active_draft?.is_endorsed) {
      return 'This definition is already endorsed';
    }
    return 'Endorse this definition as a perspective curator';
  }

  onEndorseClick(): void {
    if (!this.canEndorse() || this.entry.active_draft?.is_endorsed) {
      return;
    }

    this.glossaryService.endorseEntry(this.entry.id).subscribe({
      next: updatedEntry => {
        this.entry = updatedEntry;
        this.notificationService.success(
          `Definition for "${this.entry.term.text}" endorsed successfully!`
        );
      },
      error: error => {
        console.error('Failed to endorse definition:', error);
        let errorMessage = 'Failed to endorse definition. Please try again.';

        if (error.status === 400 && error.error?.detail) {
          errorMessage = error.error.detail;
        } else if (error.status === 403) {
          errorMessage = 'You do not have permission to endorse definitions.';
        }

        this.notificationService.error(errorMessage);
      },
    });
  }

  getInitials = getInitialsFromName;
  getUserDisplayName = getUserDisplayName;

  hasUnpublishedDrafts(): boolean {
    return this.draftHistory?.some(draft => !draft.is_published) ?? false;
  }

  getPublishedDraft(): EntryDraft | null {
    return this.draftHistory.find(draft => draft.is_published) || null;
  }

  getLatestDraftContent(): string {
    if (this.latestDraft) {
      return this.latestDraft.content;
    }
    return this.entry?.active_draft?.content || '';
  }

  getPublishedContent(): string {
    const publishedDraft = this.getPublishedDraft();
    return publishedDraft?.content || '';
  }

  switchToPerspective(entry: Entry): void {
    this.entry = entry;
    this.loadComments();
    this.loadDraftHistory();
  }

  hasMultiplePerspectives(): boolean {
    return this.termEntries.length > 1;
  }

  loadAllEntriesForTerm(): void {
    if (!this.entry?.term?.id) return;

    // Load all entries for this term
    this.glossaryService.getEntries({ term: this.entry.term.id }).subscribe({
      next: response => {
        this.termEntries = response.results;
        // Ensure the current entry is in the list
        const currentEntryInList = this.termEntries.find(e => e.id === this.entry?.id);
        if (!currentEntryInList) {
          this.termEntries.unshift(this.entry);
        }
      },
      error: error => {
        console.error('Error loading entries for term:', error);
        // Fallback: just use the current entry
        this.termEntries = [this.entry];
      },
    });
  }

  toggleVersionHistory(): void {
    this.showVersionHistory = !this.showVersionHistory;
  }

  onVersionHistoryClosed(): void {
    this.showVersionHistory = false;
  }

  onDraftSelected(draft: EntryDraft): void {
    // Update the view to show the selected draft
    this.selectedHistoricalDraft = draft;
    // Reload comments for the selected historical draft
    if (this.entry?.id) {
      this.commentsLoadedForEntryId = null; // Force reload
      this.loadComments();
    }
  }

  private setupEntryLinkHandlers(): void {
    // Add click listener to handle entry links
    const handleLinkClick = (event: Event) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'A' && target.hasAttribute('data-entry-id')) {
        event.preventDefault();
        const entryId = parseInt(target.getAttribute('data-entry-id') || '0', 10);
        if (entryId) {
          this.navigationService.navigateToEntry(entryId);
        }
      }
    };

    // Use native click handler on content area
    document.addEventListener('click', handleLinkClick);

    // Clean up on destroy
    this.destroy$.subscribe(() => {
      document.removeEventListener('click', handleLinkClick);
    });
  }
}
