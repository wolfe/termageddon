import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Entry, Comment } from '../../models';
import { PermissionService } from '../../services/permission.service';
import { GlossaryService } from '../../services/glossary.service';
import { DefinitionFormComponent } from '../definition-form/definition-form.component';
import { CommentThreadComponent } from '../comment-thread/comment-thread.component';
import { getInitialsFromName, getUserDisplayName } from '../../utils/user.util';

@Component({
  selector: 'app-term-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, DefinitionFormComponent, CommentThreadComponent],
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

  constructor(
    private sanitizer: DomSanitizer,
    public permissionService: PermissionService,
    private glossaryService: GlossaryService,
  ) {}

  ngOnInit(): void {
    this.loadComments();
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
    
    // When entry changes, load comments and all entries for this term if needed
    if (changes['entry'] && this.entry) {
      this.loadComments();
      if (this.termEntries.length === 0) {
        this.loadAllEntriesForTerm();
      }
    }
  }

  loadComments(): void {
    if (!this.entry?.id) return;
    
    this.isLoadingComments = true;
    this.glossaryService.getComments(1, this.entry.id).subscribe({
      next: (response) => {
        this.comments = response.results;
        this.isLoadingComments = false;
      },
      error: (error) => {
        console.error('Error loading comments:', error);
        this.isLoadingComments = false;
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
    // Initialize edit content with current content
    this.editContent = this.entry?.active_draft?.content || '';
    this.editRequested.emit();
  }

  onSaveEdit(): void {
    console.log('Saving definition:', this.editContent.trim());
    console.log('Current user:', this.permissionService.currentUser);

    // First check if there's an existing unpublished version by the current user
    this.checkForExistingUnpublishedDraft();
  }

  private checkForExistingUnpublishedDraft(): void {
    if (!this.permissionService.currentUser) {
      alert('You must be logged in to save definitions.');
      return;
    }

    // Check for existing unpublished draft
    this.glossaryService
      .getUnpublishedDraftForEntry(
        this.entry.id,
        this.permissionService.currentUser.id,
      )
      .subscribe({
        next: (existingDraft) => {
          if (existingDraft) {
            // Update existing unpublished draft
            this.updateExistingDraft(existingDraft.id);
          } else {
            // Create new draft
            this.createNewDraft();
          }
        },
        error: (error) => {
          console.error('Error checking for existing draft:', error);
          // If there's an error checking, try to create a new draft
          this.createNewDraft();
        },
      });
  }

  private updateExistingDraft(draftId: number): void {
    const updateData = {
      content: this.editContent.trim(),
    };

    console.log('Updating existing draft:', draftId, updateData);

    this.glossaryService.updateEntryDraft(draftId, updateData).subscribe({
      next: (updatedDraft) => {
        console.log('Successfully updated draft:', updatedDraft);
        this.editSaved.emit(this.entry);
        alert(
          'Definition updated successfully! It will be visible once approved.',
        );
      },
      error: (error) => {
        console.error('Failed to update draft:', error);
        this.handleSaveError(error);
      },
    });
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
        this.editSaved.emit(this.entry);
        alert(
          'Definition saved successfully! It will be visible once approved.',
        );
      },
      error: (error) => {
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
        errorMessage =
          'Invalid data provided. Please check your input and try again.';
      }
    } else if (error.status === 403) {
      errorMessage = 'You do not have permission to save definitions.';
    } else if (error.status === 500) {
      errorMessage = 'Server error occurred. Please contact support.';
    }

    alert(errorMessage);
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
        alert('Definition endorsed successfully!');
      },
      error: (error) => {
        console.error('Failed to endorse definition:', error);
        let errorMessage = 'Failed to endorse definition. Please try again.';
        
        if (error.status === 400 && error.error?.detail) {
          errorMessage = error.error.detail;
        } else if (error.status === 403) {
          errorMessage = 'You do not have permission to endorse definitions.';
        }
        
        alert(errorMessage);
      }
    });
  }

  getInitials = getInitialsFromName;
  getUserDisplayName = getUserDisplayName;

  switchToPerspective(entry: Entry): void {
    this.entry = entry;
    this.loadComments();
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
}
