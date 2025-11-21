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
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { Entry, PaginatedResponse, GroupedEntry } from '../../../models';
import { GlossaryService } from '../../../services/glossary.service';
import { PerspectivePillComponent } from '../perspective-pill/perspective-pill.component';

@Component({
  selector: 'app-entry-link-selector-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, PerspectivePillComponent],
  templateUrl: './entry-link-selector-dialog.component.html',
  styleUrls: ['./entry-link-selector-dialog.component.scss'],
})
export class EntryLinkSelectorDialogComponent implements OnInit, OnChanges, OnDestroy {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() entrySelected = new EventEmitter<Entry>();

  groupedEntries: GroupedEntry[] = [];
  filteredEntries: GroupedEntry[] = [];
  searchTerm = '';
  loading = false;
  loadingMore = false;
  error: string | null = null;
  selectedEntry: Entry | null = null;

  // Pagination state
  currentPage: number = 1;
  hasNextPage: boolean = false;
  nextPageUrl: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private glossaryService: GlossaryService) {}

  ngOnInit() {
    if (this.isOpen) {
      this.loadEntries();
    }
  }

  ngOnChanges() {
    if (this.isOpen) {
      this.loadEntries();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadEntries(reset: boolean = true) {
    if (reset) {
      this.loading = true;
      this.currentPage = 1;
      this.groupedEntries = [];
      this.filteredEntries = [];
      this.hasNextPage = false;
      this.nextPageUrl = null;
      this.searchTerm = '';
      this.selectedEntry = null;
    } else {
      this.loadingMore = true;
    }

    this.error = null;

    this.glossaryService
      .getEntriesGroupedByTerm({}, reset ? 1 : this.currentPage + 1)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (reset) {
            this.groupedEntries = response.results;
            this.filteredEntries = [...response.results];
          } else {
            // Append new results
            this.groupedEntries = [...this.groupedEntries, ...response.results];
            this.filteredEntries = [...this.filteredEntries, ...response.results];
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
          console.error('Error loading entries:', error);
          this.error = 'Failed to load entries';
          this.loading = false;
          this.loadingMore = false;
        },
      });
  }

  loadMoreEntries() {
    if (this.hasNextPage && !this.loadingMore && !this.loading) {
      this.loadEntries(false);
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
      this.loadMoreEntries();
    }
  }

  onSearchChange() {
    if (!this.searchTerm.trim()) {
      this.filteredEntries = [...this.groupedEntries];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredEntries = this.groupedEntries
      .filter(group => {
        // Check if term matches
        if (group.term.text.toLowerCase().includes(term)) {
          return true;
        }

        // Check if any entry in the group matches
        return group.entries.some(
          (entry: Entry) =>
            entry.perspective.name.toLowerCase().includes(term) ||
            (entry.active_draft?.content && entry.active_draft.content.toLowerCase().includes(term))
        );
      })
      .map(group => ({
        ...group,
        entries: group.entries.filter(
          (entry: Entry) =>
            entry.perspective.name.toLowerCase().includes(term) ||
            (entry.active_draft?.content && entry.active_draft.content.toLowerCase().includes(term))
        ),
      }));
  }

  selectEntry(entry: Entry) {
    this.selectedEntry = entry;
  }

  confirmSelection() {
    if (this.selectedEntry) {
      this.entrySelected.emit(this.selectedEntry);
      this.close.emit();
    }
  }

  onCancel() {
    this.close.emit();
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.onCancel();
    }
  }

  getEntryDisplayText(entry: Entry): string {
    return `${entry.term.text} (${entry.perspective.name})`;
  }

  getEntryPreview(entry: Entry): string {
    if (entry.active_draft?.content) {
      // Strip HTML tags and limit length
      const text = entry.active_draft.content.replace(/<[^>]*>/g, '');
      return text.length > 100 ? text.substring(0, 100) + '...' : text;
    }
    return 'No definition available';
  }
}
