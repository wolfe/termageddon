import {
  Component,
  EventEmitter,
  OnInit,
  Output,
  ViewChild,
  ElementRef,
  HostListener,
  OnDestroy,
} from '@angular/core';

import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Perspective, Entry, User, GroupedEntry } from '../../models';
import { GlossaryService } from '../../services/glossary.service';
import { TermDialogComponent } from '../term-dialog/term-dialog.component';
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
    TermDialogComponent,
    CreateEntryDialogComponent,
    PerspectivePillComponent,
    SearchFilterBarComponent
],
    templateUrl: './term-list.component.html',
    styleUrl: './term-list.component.scss'
})
export class TermListComponent implements OnInit, OnDestroy {
  @Output() entrySelected = new EventEmitter<Entry>();
  @Output() termSelected = new EventEmitter<Entry[]>();
  @Output() termCreated = new EventEmitter<Entry>();

  entries: Entry[] = [];
  groupedEntries: GroupedEntry[] = [];
  perspectives: Perspective[] = [];
  users: User[] = [];
  isLoading: boolean = false;
  isLoadingMore: boolean = false;
  selectedEntry: Entry | null = null;
  showCreateDialog: boolean = false;
  currentPage: number = 1;
  hasNextPage: boolean = false;
  nextPageUrl: string | null = null;

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

  constructor(private glossaryService: GlossaryService) {}

  ngOnInit(): void {
    this.loadPerspectives();
    this.loadUsers();
    this.loadEntries();

    // Search with debounce
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => this.loadEntries());

    // Other filters trigger immediate search
    this.perspectiveControl.valueChanges.subscribe(() => this.loadEntries());
    this.authorControl.valueChanges.subscribe(() => this.loadEntries());
    this.sortControl.valueChanges.subscribe(() => this.loadEntries());
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
      this.isLoading = true;
      this.currentPage = 1;
      this.groupedEntries = [];
      this.entries = [];
      this.hasNextPage = false;
      this.nextPageUrl = null;
      // Reset scroll position when filters change
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = 0;
      }
    } else {
      this.isLoadingMore = true;
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

    if (!reset) {
      filters.page = this.currentPage + 1;
    }

    // Use new grouped_by_term endpoint with pagination
    this.glossaryService.getEntriesGroupedByTerm(filters, reset ? 1 : this.currentPage + 1).subscribe({
      next: response => {
        // Ensure results is an array
        const results = Array.isArray(response.results) ? response.results : [];

        if (reset) {
          this.groupedEntries = results;
          this.entries = results.flatMap(group => group.entries || []);
        } else {
          // Append new results
          this.groupedEntries = [...this.groupedEntries, ...results];
          this.entries = [...this.entries, ...results.flatMap(group => group.entries || [])];
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

        this.isLoading = false;
        this.isLoadingMore = false;
      },
      error: error => {
        console.error('Failed to load entries:', error);
        this.isLoading = false;
        this.isLoadingMore = false;
      },
    });
  }

  loadMoreEntries(): void {
    if (this.hasNextPage && !this.isLoadingMore && !this.isLoading) {
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
    if (scrollTop + clientHeight >= scrollHeight - 200 && this.hasNextPage && !this.isLoadingMore && !this.isLoading) {
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
