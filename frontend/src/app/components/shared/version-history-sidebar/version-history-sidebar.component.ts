import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  OnChanges,
  DestroyRef,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { EntryDraft } from '../../../models';
import { EntryDetailService } from '../../../services/entry-detail.service';
import { getInitials, getUserDisplayName } from '../../../utils/user.util';

@Component({
    selector: 'app-version-history-sidebar',
    imports: [CommonModule],
    templateUrl: './version-history-sidebar.component.html',
    styleUrls: ['./version-history-sidebar.component.scss'],
    standalone: true
})
export class VersionHistorySidebarComponent implements OnInit, OnChanges {
  @Input() entryId: number | null = null;
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() draftSelected = new EventEmitter<EntryDraft>();

  draftHistory: EntryDraft[] = [];
  selectedDraft: EntryDraft | null = null;
  loading = false;
  loadingMore = false;
  error: string | null = null;

  // Pagination state
  currentPage: number = 1;
  hasNextPage: boolean = false;
  nextPageUrl: string | null = null;

  private destroyRef = inject(DestroyRef);

  constructor(private entryDetailService: EntryDetailService) {}

  ngOnInit() {
    if (this.entryId) {
      this.loadDraftHistory();
    }
  }

  ngOnChanges() {
    if (this.entryId) {
      this.loadDraftHistory();
    }
  }

  loadDraftHistory(reset: boolean = true) {
    if (!this.entryId) return;

    if (reset) {
      this.loading = true;
      this.currentPage = 1;
      this.draftHistory = [];
      this.hasNextPage = false;
      this.nextPageUrl = null;
    } else {
      this.loadingMore = true;
    }

    this.error = null;

    this.entryDetailService
      .loadDraftHistory(this.entryId, reset ? 1 : this.currentPage + 1)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (reset) {
            this.draftHistory = response.results;
            // Select the latest draft by default
            if (response.results.length > 0) {
              this.selectedDraft = response.results[0];
            }
          } else {
            // Append new results
            this.draftHistory = [...this.draftHistory, ...response.results];
          }

          this.hasNextPage = !!response.next;
          this.nextPageUrl = response.next;
          if (response.next) {
            // Extract page number from next URL if available
            const urlParams = new URLSearchParams(response.next.split('?')[1] || '');
            const nextPage = urlParams.get('page');
            if (nextPage) {
              this.currentPage = parseInt(nextPage, 10) - 1;
            } else {
              this.currentPage = reset ? 1 : this.currentPage + 1;
            }
          }

          this.loading = false;
          this.loadingMore = false;
        },
        error: (error: any) => {
          console.error('Error loading draft history:', error);
          this.error = 'Failed to load version history';
          this.loading = false;
          this.loadingMore = false;
        },
      });
  }

  loadMoreDraftHistory() {
    if (this.hasNextPage && !this.loadingMore && !this.loading) {
      this.loadDraftHistory(false);
    }
  }

  onScroll(event: Event) {
    const target = event.target as HTMLElement;
    if (!target) return;

    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;

    // Load more when user scrolls to within 200px of bottom
    if (scrollTop + clientHeight >= scrollHeight - 200 && this.hasNextPage && !this.loadingMore && !this.loading) {
      this.loadMoreDraftHistory();
    }
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
