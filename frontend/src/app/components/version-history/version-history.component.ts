import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EntryDraft, Entry, User } from '../../models';
import { GlossaryService } from '../../services/glossary.service';

@Component({
  selector: 'app-version-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './version-history.component.html',
  styleUrls: ['./version-history.component.scss'],
})
export class VersionHistoryComponent implements OnInit {
  @Input() entry!: Entry;
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() draftSelected = new EventEmitter<EntryDraft>();

  drafts: EntryDraft[] = [];
  loading = false;
  error: string | null = null;
  selectedDraft: EntryDraft | null = null;

  constructor(private glossaryService: GlossaryService) {}

  ngOnInit() {
    if (this.isOpen && this.entry) {
      this.loadDrafts();
    }
  }

  ngOnChanges() {
    if (this.isOpen && this.entry) {
      this.loadDrafts();
    }
  }

  loadDrafts() {
    this.loading = true;
    this.error = null;

    this.glossaryService.getEntryDrafts(this.entry.id).subscribe({
      next: (response) => {
        this.drafts = response.results;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading drafts:', error);
        this.error = 'Failed to load draft history';
        this.loading = false;
      },
    });
  }

  selectDraft(draft: EntryDraft) {
    this.selectedDraft = draft;
    this.draftSelected.emit(draft);
  }

  isActiveDraft(draft: EntryDraft): boolean {
    return this.entry.active_draft?.id === draft.id;
  }

  getDraftStatus(draft: EntryDraft): string {
    if (draft.is_published) {
      return 'Published';
    } else if (draft.is_approved) {
      return 'Approved';
    } else {
      return 'Pending';
    }
  }

  getDraftStatusClass(draft: EntryDraft): string {
    if (draft.is_published) {
      return 'status-published';
    } else if (draft.is_approved) {
      return 'status-approved';
    } else {
      return 'status-pending';
    }
  }

  getInitials(user: User): string {
    return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
  }

  onClose() {
    this.close.emit();
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }
}
