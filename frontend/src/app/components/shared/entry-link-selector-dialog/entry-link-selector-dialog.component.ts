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

import { FormsModule } from '@angular/forms';
import { Entry, PaginatedResponse, GroupedEntry } from '../../../models';
import { GlossaryService } from '../../../services/glossary.service';
import { PaginationService, PaginationState } from '../../../services/pagination.service';
import {
  createLoadingState,
  resetLoadingState,
  startLoadingMore,
  completeLoadingState,
  setErrorState,
  LoadingState,
} from '../../../utils/loading-state.util';
import { PerspectivePillComponent } from '../perspective-pill/perspective-pill.component';

@Component({
    selector: 'app-entry-link-selector-dialog',
    imports: [FormsModule, PerspectivePillComponent],
    templateUrl: './entry-link-selector-dialog.component.html',
    styleUrls: ['./entry-link-selector-dialog.component.scss'],
    standalone: true
})
export class EntryLinkSelectorDialogComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() entrySelected = new EventEmitter<Entry>();

  groupedEntries: GroupedEntry[] = [];
  filteredEntries: GroupedEntry[] = [];
  searchTerm = '';
  selectedEntry: Entry | null = null;

  // Use utilities for pagination and loading state
  paginationState!: PaginationState<GroupedEntry>;
  loadingState: LoadingState = createLoadingState();

  // Expose properties for template
  get loading(): boolean {
    return this.loadingState.isLoading;
  }
  get loadingMore(): boolean {
    return this.loadingState.isLoadingMore;
  }
  get error(): string | null {
    return this.loadingState.error;
  }
  get currentPage(): number {
    return this.paginationState.currentPage;
  }
  get hasNextPage(): boolean {
    return this.paginationState.hasNextPage;
  }
  get nextPageUrl(): string | null {
    return this.paginationState.nextPageUrl;
  }

  private destroyRef = inject(DestroyRef);

  constructor(
    private glossaryService: GlossaryService,
    private paginationService: PaginationService
  ) {
    this.paginationState = this.paginationService.createInitialState();
  }

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

  loadEntries(reset: boolean = true) {
    if (reset) {
      this.loadingState = resetLoadingState(this.loadingState);
      this.paginationState = this.paginationService.resetState(this.paginationState);
      this.groupedEntries = [];
      this.filteredEntries = [];
      this.searchTerm = '';
      this.selectedEntry = null;
    } else {
      this.loadingState = startLoadingMore(this.loadingState);
    }

    this.loadingState = { ...this.loadingState, error: null };

    this.glossaryService
      .getEntriesGroupedByTerm({}, reset ? 1 : this.paginationState.currentPage + 1)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.paginationState = this.paginationService.updatePaginationState(
            this.paginationState,
            response,
            reset
          );

          this.groupedEntries = this.paginationState.items;
          this.filteredEntries = reset
            ? [...this.paginationState.items]
            : [...this.filteredEntries, ...response.results];

          this.loadingState = completeLoadingState(this.loadingState);
        },
        error: (error: any) => {
          console.error('Error loading entries:', error);
          this.loadingState = setErrorState(this.loadingState, 'Failed to load entries');
        },
      });
  }

  loadMoreEntries() {
    if (this.paginationState.hasNextPage && !this.loadingState.isLoadingMore && !this.loadingState.isLoading) {
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
    if (
      scrollTop + clientHeight >= scrollHeight - 200 &&
      this.paginationState.hasNextPage &&
      !this.loadingState.isLoadingMore &&
      !this.loadingState.isLoading
    ) {
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
