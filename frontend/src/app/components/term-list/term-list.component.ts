import {
  Component,
  EventEmitter,
  OnInit,
  Output,
  ViewChild,
  ElementRef,
  HostListener,
  OnDestroy,
  DestroyRef,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { Perspective, Entry, User, GroupedEntry } from '../../models';
import { GlossaryService } from '../../services/glossary.service';
import { PaginationService, PaginationState } from '../../services/pagination.service';
import {
  createLoadingState,
  resetLoadingState,
  startLoadingMore,
  completeLoadingState,
  setErrorState,
  LoadingState,
} from '../../utils/loading-state.util';
import { CreateEntryDialogComponent } from '../create-entry-dialog/create-entry-dialog.component';
import { PerspectivePillComponent } from '../shared/perspective-pill/perspective-pill.component';
import {
  SearchFilterBarComponent,
  SortOption,
} from '../shared/search-filter-bar/search-filter-bar.component';

@Component({
    selector: 'app-term-list',
    imports: [
    ReactiveFormsModule,
    CreateEntryDialogComponent,
    PerspectivePillComponent,
    SearchFilterBarComponent
],
    templateUrl: './term-list.component.html',
    styleUrl: './term-list.component.scss',
    standalone: true
})
export class TermListComponent implements OnInit, OnDestroy {
  @Output() entrySelected = new EventEmitter<Entry>();
  @Output() termSelected = new EventEmitter<Entry[]>();
  @Output() termCreated = new EventEmitter<Entry>();

  entries: Entry[] = [];
  groupedEntries: GroupedEntry[] = [];
  perspectives: Perspective[] = [];
  users: User[] = [];
  selectedEntry: Entry | null = null;
  showCreateDialog: boolean = false;

  // Use utilities for pagination and loading state
  paginationState!: PaginationState<GroupedEntry>;
  loadingState: LoadingState = createLoadingState();

  // Expose properties for template
  get isLoading(): boolean {
    return this.loadingState.isLoading;
  }
  get isLoadingMore(): boolean {
    return this.loadingState.isLoadingMore;
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

  @ViewChild('scrollContainer', { static: false }) scrollContainer!: ElementRef;

  searchControl = new FormControl('');
  perspectiveControl = new FormControl('');
  authorControl = new FormControl('');
  sortControl = new FormControl('-published_at'); // Default to newest published first

  // Sort options for SearchFilterBarComponent
  sortOptions: SortOption[] = [
    { value: '-published_at', label: 'Newest Published' },
    { value: '-created_at', label: 'Newest Edits' },
    { value: 'term__text_normalized', label: 'Term A-Z' },
    { value: '-term__text_normalized', label: 'Term Z-A' },
  ];

  private destroyRef = inject(DestroyRef);

  constructor(
    private glossaryService: GlossaryService,
    private paginationService: PaginationService
  ) {
    this.paginationState = this.paginationService.createInitialState();
  }

  ngOnInit(): void {
    this.loadPerspectives();
    this.loadUsers();
    this.loadEntries();

    // Search with debounce
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadEntries());

    // Other filters trigger immediate search
    this.perspectiveControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadEntries());
    this.authorControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadEntries());
    this.sortControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadEntries());
  }

  loadPerspectives(): void {
    this.glossaryService.getPerspectives().subscribe({
      next: response => {
        this.perspectives = response.results;
      },
      error: error => {
        console.error('Failed to load perspectives:', error);
      },
    });
  }

  loadUsers(): void {
    this.glossaryService.getUsers(1).subscribe({
      next: response => {
        this.users = response.results;
      },
      error: error => {
        console.error('Failed to load users:', error);
      },
    });
  }

  loadEntries(reset: boolean = true): void {
    if (reset) {
      this.loadingState = resetLoadingState(this.loadingState);
      this.paginationState = this.paginationService.resetState(this.paginationState);
      this.groupedEntries = [];
      this.entries = [];
      // Reset scroll position when filters change
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = 0;
      }
    } else {
      this.loadingState = startLoadingMore(this.loadingState);
    }

    const filters: any = {};

    if (this.searchControl.value) {
      filters.search = this.searchControl.value;
    }

    if (this.perspectiveControl.value) {
      filters.perspective = this.perspectiveControl.value;
    }

    if (this.authorControl.value) {
      filters.author = this.authorControl.value;
    }

    if (this.sortControl.value) {
      filters.ordering = this.sortControl.value;
    }

    // Use new grouped_by_term endpoint with pagination
    this.glossaryService
      .getEntriesGroupedByTerm(filters, reset ? 1 : this.paginationState.currentPage + 1)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          // Ensure results is an array
          const results = Array.isArray(response.results) ? response.results : [];

          this.paginationState = this.paginationService.updatePaginationState(
            this.paginationState,
            { ...response, results },
            reset
          );

          this.groupedEntries = this.paginationState.items;
          this.entries = this.paginationState.items.flatMap(group => group.entries || []);

          this.loadingState = completeLoadingState(this.loadingState);
        },
        error: error => {
          console.error('Failed to load entries:', error);
          this.loadingState = setErrorState(this.loadingState, 'Failed to load entries');
        },
      });
  }

  loadMoreEntries(): void {
    if (this.paginationState.hasNextPage && !this.loadingState.isLoadingMore && !this.loadingState.isLoading) {
      this.loadEntries(false);
    }
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (!this.scrollContainer) return;

    const element = this.scrollContainer.nativeElement;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;

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

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  selectEntry(entry: Entry): void {
    this.selectedEntry = entry;
    this.entrySelected.emit(entry);
    // Also emit termSelected with all entries for this term to populate termEntries
    const termId = entry.term.id;
    const groupedEntry = this.groupedEntries.find(group => group.term.id === termId);
    const allEntriesForTerm = groupedEntry?.entries || [];
    this.termSelected.emit(allEntriesForTerm);
  }

  selectTerm(termEntries: Entry[]): void {
    this.selectedEntry = termEntries[0];
    this.termSelected.emit(termEntries);
  }

  clearFilters(): void {
    this.searchControl.setValue('');
    this.perspectiveControl.setValue('');
    this.authorControl.setValue('');
    this.sortControl.setValue('-published_at');
    // The FormControl valueChanges observers will trigger loadEntries()
  }

  getFilterCount(): number {
    let count = 0;
    if (this.searchControl.value) count++;
    if (this.perspectiveControl.value) count++;
    if (this.authorControl.value) count++;
    return count;
  }

  openCreateDialog(): void {
    this.showCreateDialog = true;
  }

  onTermCreated(entry: Entry): void {
    this.showCreateDialog = false;
    this.termCreated.emit(entry);
    this.loadEntries(); // Refresh the list
  }

  onDialogClosed(): void {
    this.showCreateDialog = false;
  }

  getGroupedTermsArray(): Entry[][] {
    return this.groupedEntries.map(group => group.entries);
  }

  getFirstEntryForTerm(termEntries: Entry[]): Entry {
    // Return the first entry (could be sorted by perspective priority in the future)
    return termEntries[0];
  }

  selectEntryByPerspective(entry: Entry): void {
    this.selectEntry(entry);
    // Also emit termSelected with all entries for this term to populate termEntries
    const termId = entry.term.id;
    const groupedEntry = this.groupedEntries.find(group => group.term.id === termId);
    const allEntriesForTerm = groupedEntry?.entries || [];
    this.termSelected.emit(allEntriesForTerm);
  }

  hasAnyEndorsedEntry(termEntries: Entry[]): boolean {
    return termEntries.some(entry => entry.active_draft?.is_endorsed);
  }

  // Change handlers for SearchFilterBarComponent
  onPerspectiveChanged(perspectiveId: number | null): void {
    this.perspectiveControl.setValue(perspectiveId?.toString() || '');
  }

  onAuthorChanged(authorId: number | null): void {
    this.authorControl.setValue(authorId?.toString() || '');
  }

  onSortChanged(sortBy: string): void {
    this.sortControl.setValue(sortBy);
  }

  onSearchTermChange(value: string): void {
    this.searchControl.setValue(value);
  }

  onSearchEvent(searchTerm: string): void {
    this.loadEntries();
  }
}
