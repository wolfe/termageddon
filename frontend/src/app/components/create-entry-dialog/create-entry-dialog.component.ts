import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GlossaryService } from '../../services/glossary.service';
import { NavigationService } from '../../services/navigation.service';
import { AuthService } from '../../services/auth.service';
import {
  Perspective,
  Term,
  Entry,
  CreateEntryRequest,
  EntryLookupResponse,
  User,
} from '../../models';
import { TermAutocompleteComponent } from '../shared/term-autocomplete/term-autocomplete.component';

@Component({
    selector: 'app-create-entry-dialog',
    imports: [CommonModule, FormsModule, TermAutocompleteComponent],
    templateUrl: './create-entry-dialog.component.html',
    styleUrls: ['./create-entry-dialog.component.scss']
})
export class CreateEntryDialogComponent implements OnInit {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() entryCreated = new EventEmitter<Entry>();

  selectedTermId: number | null = null;
  selectedTermText = '';
  selectedPerspectiveId: number | null = null;
  perspectives: Perspective[] = [];
  users: User[] = [];
  perspectiveStatuses: { [key: number]: PerspectiveStatus } = {};
  isLoading = false;
  isLookingUp = false;
  error: string | null = null;
  currentUser: User | null = null;

  constructor(
    private glossaryService: GlossaryService,
    private navigationService: NavigationService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadPerspectives();
    this.loadUsers();
    this.authService.getCurrentUser().subscribe(user => {
      this.currentUser = user;
    });
  }

  loadUsers() {
    this.glossaryService.getUsers(1).subscribe({
      next: response => {
        this.users = response.results;
        this.initializePerspectiveStatuses();
      },
      error: error => {
        console.error('Error loading users:', error);
      },
    });
  }

  loadPerspectives() {
    this.glossaryService.getPerspectives().subscribe({
      next: response => {
        this.perspectives = response.results;
        this.initializePerspectiveStatuses();
      },
      error: error => {
        console.error('Error loading perspectives:', error);
        this.error = 'Failed to load perspectives';
      },
    });
  }

  private initializePerspectiveStatuses() {
    // Only initialize if both perspectives and users are loaded
    if (this.perspectives.length > 0 && this.users.length > 0) {
      this.perspectives.forEach(perspective => {
        this.perspectiveStatuses[perspective.id] = {
          hasPublishedDraft: false,
          hasUnpublishedDraft: false,
          unpublishedDraftAuthorId: null,
          unpublishedDraftAuthorName: null,
        };
      });
    }
  }

  onTermSelected(event: { termId: number | null; termText: string }) {
    this.selectedTermId = event.termId;
    this.selectedTermText = event.termText;
    this.updatePerspectiveStatuses();
  }

  onPerspectiveSelected() {
    this.updatePerspectiveStatuses();
  }

  private updatePerspectiveStatuses() {
    if ((!this.selectedTermId && !this.selectedTermText.trim()) || !this.selectedPerspectiveId) {
      return;
    }

    this.isLookingUp = true;
    const request: CreateEntryRequest = {
      perspective_id: this.selectedPerspectiveId,
    };

    if (this.selectedTermId) {
      request.term_id = this.selectedTermId;
    } else if (this.selectedTermText.trim()) {
      request.term_text = this.selectedTermText.trim();
    }

    this.glossaryService.lookupOrCreateEntry(request).subscribe({
      next: (response: EntryLookupResponse) => {
        this.isLookingUp = false;
        this.updatePerspectiveStatus(this.selectedPerspectiveId!, response);
      },
      error: error => {
        this.isLookingUp = false;
        console.error('Error looking up entry:', error);
      },
    });
  }

  private updatePerspectiveStatus(perspectiveId: number, response: EntryLookupResponse) {
    this.perspectiveStatuses[perspectiveId] = {
      hasPublishedDraft: response.has_published_draft,
      hasUnpublishedDraft: response.has_unpublished_draft,
      unpublishedDraftAuthorId: response.unpublished_draft_author_id,
      unpublishedDraftAuthorName: response.unpublished_draft_author_id
        ? this.getAuthorName(response.unpublished_draft_author_id)
        : null,
    };
  }

  private getAuthorName(authorId: number): string {
    const user = this.users.find(u => u.id === authorId);
    return user ? user.username : 'Unknown User';
  }

  getPerspectiveStatusIcon(perspectiveId: number): string {
    const status = this.perspectiveStatuses[perspectiveId];
    if (!status) return '';

    if (status.hasPublishedDraft) {
      return '✓';
    } else if (status.hasUnpublishedDraft) {
      return '📝';
    }
    return '';
  }

  getPerspectiveStatusTooltip(perspectiveId: number): string {
    const status = this.perspectiveStatuses[perspectiveId];
    if (!status) return 'No entry yet';

    if (status.hasPublishedDraft) {
      return 'Published entry exists';
    } else if (status.hasUnpublishedDraft) {
      if (status.unpublishedDraftAuthorId === this.currentUser?.id) {
        return 'You have a draft in progress';
      } else {
        return `Draft in progress by ${status.unpublishedDraftAuthorName || 'another user'}`;
      }
    }
    return 'No entry yet';
  }

  getButtonText(): string {
    if (!this.selectedTermId || !this.selectedPerspectiveId) {
      return 'Create Entry';
    }

    const status = this.perspectiveStatuses[this.selectedPerspectiveId];
    if (!status) return 'Create Entry';

    if (status.hasPublishedDraft && !status.hasUnpublishedDraft) {
      return 'View Entry';
    } else if (status.hasUnpublishedDraft) {
      return 'View Entry';
    }

    return 'Create Entry';
  }

  onClose() {
    this.resetForm();
    this.close.emit();
  }

  onSave() {
    if (!this.selectedTermText.trim() || !this.selectedPerspectiveId) {
      this.error = 'Please enter a term and select a perspective';
      return;
    }

    this.isLoading = true;
    this.error = null;

    // Check if this is a "View Entry" action for existing entries
    const status = this.perspectiveStatuses[this.selectedPerspectiveId];
    if (status && (status.hasPublishedDraft || status.hasUnpublishedDraft)) {
      // This is viewing an existing entry, use the existing logic
      const request: CreateEntryRequest = {
        term_id: this.selectedTermId || undefined,
        term_text: this.selectedTermText.trim(),
        perspective_id: this.selectedPerspectiveId,
      };

      this.glossaryService.lookupOrCreateEntry(request).subscribe({
        next: (response: EntryLookupResponse) => {
          this.isLoading = false;

          if (response.entry) {
            this.entryCreated.emit(response.entry);
          }

          // Navigate using smart routing
          this.navigateAfterCreation(response);
          this.resetForm();
          this.close.emit();
        },
        error: error => {
          this.isLoading = false;
          this.error = 'Failed to create entry: ' + (error.error?.detail || error.message);
        },
      });
    } else {
      // This is creating a new entry, navigate to /entry/new
      this.isLoading = false;
      this.router.navigate(['/entry/new'], {
        queryParams: {
          term: this.selectedTermText.trim(),
          perspective: this.selectedPerspectiveId,
        },
      });
      this.resetForm();
      this.close.emit();
    }
  }

  private navigateAfterCreation(response: EntryLookupResponse) {
    if (!response.entry_id || !this.currentUser) {
      return;
    }

    // For new entries, we need to navigate to My Drafts to create the first draft
    if (response.is_new) {
      this.navigationService.navigateToPanelWithEntry('/my-drafts', response.entry_id, true);
      return;
    }

    // For existing entries, use draft-based navigation
    if (response.entry) {
      this.navigateToSmartPanel(response.entry);
    }
  }

  private navigateToSmartPanel(entry: Entry) {
    if (!this.currentUser) return;

    // Determine the appropriate panel based on entry state
    const targetPanel = this.navigationService.determineTargetPanel(entry, this.currentUser, false);

    // Check if targetPanel is a draft URL (starts with /draft/)
    if (targetPanel.startsWith('/draft/')) {
      // Navigate directly to the draft URL
      this.router.navigateByUrl(targetPanel);
    } else {
      // Navigate to the panel with the entry selected
      this.navigationService.navigateToPanelWithEntry(targetPanel, entry.id!, false);
    }
  }

  private resetForm() {
    this.selectedTermId = null;
    this.selectedTermText = '';
    this.selectedPerspectiveId = null;
    this.perspectiveStatuses = {};
    this.error = null;
    // Re-initialize perspective statuses after reset
    this.initializePerspectiveStatuses();
  }
}

interface PerspectiveStatus {
  hasPublishedDraft: boolean;
  hasUnpublishedDraft: boolean;
  unpublishedDraftAuthorId: number | null;
  unpublishedDraftAuthorName: string | null;
}
