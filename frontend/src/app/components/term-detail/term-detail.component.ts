import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Entry, Comment, EntryDraft } from '../../models';
import { PermissionService } from '../../services/permission.service';
import { GlossaryService } from '../../services/glossary.service';
import { NotificationService } from '../../services/notification.service';
import { DefinitionFormComponent } from '../definition-form/definition-form.component';
import { CommentThreadComponent } from '../comment-thread/comment-thread.component';
import { UserAvatarComponent } from '../shared/user-avatar/user-avatar.component';
import { PerspectivePillComponent } from '../shared/perspective-pill/perspective-pill.component';
import { VersionHistorySidebarComponent } from '../shared/version-history-sidebar/version-history-sidebar.component';
import { getInitialsFromName, getUserDisplayName } from '../../utils/user.util';

@Component({
  selector: 'app-term-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, DefinitionFormComponent, CommentThreadComponent, UserAvatarComponent, PerspectivePillComponent, VersionHistorySidebarComponent],
  templateUrl: './term-detail.component.html',
  styleUrl: './term-detail.component.scss',
})
export class TermDetailComponent implements OnInit, OnChanges {
  @Input() entry!: Entry;
  @Input() termEntries: Entry[] = [];
  @Input() isEditMode: boolean = false;
  @Output() editRequested = new EventEmitter<void>();
  @Output() editCancelled = new EventEmitter<void>();
  @Output() editSaved = new EventEmitter<Entry>();

  editContent: string = '';
  comments: Comment[] = [];
  isLoadingComments: boolean = false;
  draftHistory: EntryDraft[] = [];
  latestDraft: EntryDraft | null = null;
  isLoadingDraftHistory: boolean = false;
  showVersionHistory: boolean = false;
  selectedHistoricalDraft: EntryDraft | null = null;

  constructor(
    public sanitizer: DomSanitizer,
    public permissionService: PermissionService,
    private glossaryService: GlossaryService,
    private notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    this.loadComments();
    this.loadDraftHistory();
    // If we only have a single entry but no termEntries, try to load all entries for this term
    if (this.entry && this.termEntries.length === 0) {
      this.loadAllEntriesForTerm();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // When termEntries changes, update the selected entry to the first one if needed
    if (changes['termEntries'] && this.termEntries.length > 0) {
      // If the current entry is not in the new termEntries, switch to the first one
      const currentEntryInNewTerm = this.termEntries.find(e => e.id === this.entry?.id);
      if (!currentEntryInNewTerm) {
        this.entry = this.termEntries[0];
        this.loadComments();
      }
    }
    
    // When entry changes, load comments, draft history and all entries for this term if needed
    if (changes['entry'] && this.entry) {
      this.loadComments();
      this.loadDraftHistory();
      if (this.termEntries.length === 0) {
        this.loadAllEntriesForTerm();
      }
    }
  }

  loadComments(): void {
    if (!this.entry?.id) return;
    
    this.isLoadingComments = true;
    // Use the new endpoint that includes draft position indicators
    this.glossaryService.getCommentsWithDraftPositions(this.entry.id).subscribe({
      next: (comments) => {
        this.comments = comments;
        this.isLoadingComments = false;
      },
      error: (error) => {
        console.error('Error loading comments:', error);
        // Fallback to regular comments endpoint
        this.glossaryService.getComments(1, this.entry.id).subscribe({
          next: (response) => {
            this.comments = response.results;
            this.isLoadingComments = false;
          },
          error: (fallbackError) => {
            console.error('Error loading comments (fallback):', fallbackError);
            this.isLoadingComments = false;
          }
        });
      }
    });
  }

  loadDraftHistory(): void {
    if (!this.entry?.id) return;
    
    this.isLoadingDraftHistory = true;
    this.glossaryService.getDraftHistory(this.entry.id).subscribe({
      next: (drafts) => {
        this.draftHistory = drafts;
        // Set the latest draft (first in the list since it's ordered by timestamp desc)
        this.latestDraft = drafts.length > 0 ? drafts[0] : null;
        this.isLoadingDraftHistory = false;
      },
      error: (error) => {
        console.error('Error loading draft history:', error);
        this.isLoadingDraftHistory = false;
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

  get sanitizedContent(): SafeHtml {
    if (this.entry?.active_draft?.content) {
      return this.sanitizer.bypassSecurityTrustHtml(
        this.entry.active_draft.content,
      );
    }
    return '';
  }

  onEditClick(): void {
    // Initialize edit content with latest draft content (not published content)
    if (this.latestDraft) {
      this.editContent = this.latestDraft.content;
    } else if (this.entry?.active_draft?.content) {
      this.editContent = this.entry.active_draft.content;
    } else {
      this.editContent = '';
    }
    this.editRequested.emit();
  }

  onSaveEdit(): void {
    console.log('Saving definition:', this.editContent.trim());
    console.log('Current user:', this.permissionService.currentUser);

    if (!this.permissionService.currentUser) {
      this.notificationService.error('You must be logged in to save definitions.');
      return;
    }

    // Always create a new draft (linear draft history)
    this.createNewDraft();
  }


  private createNewDraft(): void {
    const draftData = {
      entry: this.entry.id,
      content: this.editContent.trim(),
      author: this.permissionService.currentUser?.id || 1,
    };

    console.log('Creating new draft:', draftData);

    this.glossaryService.createEntryDraft(draftData).subscribe({
      next: (newDraft) => {
        console.log('Successfully created draft:', newDraft);
        // Refresh the draft history and entry data
        this.loadDraftHistory();
        this.refreshEntryData();
      },
      error: (error) => {
        console.error('Failed to create draft:', error);
        this.handleSaveError(error);
      },
    });
  }


  private refreshEntryData(): void {
    // Refresh the entry data to get the updated content
    this.glossaryService.getEntry(this.entry.id).subscribe({
      next: (updatedEntry) => {
        console.log('Refreshed entry data:', updatedEntry);
        console.log('Updated entry active_draft:', updatedEntry.active_draft);
        console.log('Updated entry active_draft content:', updatedEntry.active_draft?.content);
        // Update the local entry object
        Object.assign(this.entry, updatedEntry);
        // Emit the updated entry
        this.editSaved.emit(this.entry);
        this.notificationService.success(
          'Definition saved successfully! It will be visible once approved.',
        );
      },
      error: (error) => {
        console.error('Failed to refresh entry data:', error);
        // Still emit the original entry as fallback
        this.editSaved.emit(this.entry);
        this.notificationService.success(
          'Definition saved successfully! It will be visible once approved.',
        );
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
        errorMessage =
          'Invalid data provided. Please check your input and try again.';
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
      next: (updatedEntry) => {
        this.entry = updatedEntry;
        this.notificationService.success('Definition endorsed successfully!');
      },
      error: (error) => {
        console.error('Failed to endorse definition:', error);
        let errorMessage = 'Failed to endorse definition. Please try again.';
        
        if (error.status === 400 && error.error?.detail) {
          errorMessage = error.error.detail;
        } else if (error.status === 403) {
          errorMessage = 'You do not have permission to endorse definitions.';
        }
        
        this.notificationService.error(errorMessage);
      }
    });
  }

  getInitials = getInitialsFromName;
  getUserDisplayName = getUserDisplayName;

  hasUnpublishedDrafts(): boolean {
    return this.draftHistory.some(draft => !draft.is_published);
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
      next: (response) => {
        this.termEntries = response.results;
        // Ensure the current entry is in the list
        const currentEntryInList = this.termEntries.find(e => e.id === this.entry?.id);
        if (!currentEntryInList) {
          this.termEntries.unshift(this.entry);
        }
      },
      error: (error) => {
        console.error('Error loading entries for term:', error);
        // Fallback: just use the current entry
        this.termEntries = [this.entry];
      }
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
    console.log('Selected draft:', draft);
  }
}
