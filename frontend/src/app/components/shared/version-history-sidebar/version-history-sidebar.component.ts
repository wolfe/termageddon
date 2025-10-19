import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  OnChanges,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { EntryDraft } from '../../../models';
import { EntryDetailService } from '../../../services/entry-detail.service';
import { getInitials, getUserDisplayName } from '../../../utils/user.util';

@Component({
  selector: 'app-version-history-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './version-history-sidebar.component.html',
  styleUrls: ['./version-history-sidebar.component.scss'],
})
export class VersionHistorySidebarComponent implements OnInit, OnDestroy {
  @Input() entryId: number | null = null;
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() draftSelected = new EventEmitter<EntryDraft>();

  draftHistory: EntryDraft[] = [];
  selectedDraft: EntryDraft | null = null;
  loading = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private entryDetailService: EntryDetailService) {}

  ngOnInit() {
    if (this.entryId) {
      this.loadDraftHistory();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges() {
    if (this.entryId) {
      this.loadDraftHistory();
    }
  }

  loadDraftHistory() {
    if (!this.entryId) return;

    this.loading = true;
    this.error = null;

    this.entryDetailService
      .loadDraftHistory(this.entryId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (drafts: EntryDraft[]) => {
          this.draftHistory = drafts;
          // Select the latest draft by default
          if (drafts.length > 0) {
            this.selectedDraft = drafts[0];
          }
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Error loading draft history:', error);
          this.error = 'Failed to load version history';
          this.loading = false;
        },
      });
  }

  selectDraft(draft: EntryDraft) {
    this.selectedDraft = draft;
    this.draftSelected.emit(draft);
  }

  onClose() {
    this.close.emit();
  }

  getDraftStatusText(draft: EntryDraft): string {
    if (draft.is_published) {
      return 'Published';
    } else if (draft.is_approved) {
      return 'Approved';
    } else {
      return `Draft (${draft.approval_count}/2)`;
    }
  }

  getDraftStatusClass(draft: EntryDraft): string {
    if (draft.is_published) {
      return 'status-published';
    } else if (draft.is_approved) {
      return 'status-approved';
    } else {
      return 'status-draft';
    }
  }

  getInitials = getInitials;
  getUserDisplayName = getUserDisplayName;
}
