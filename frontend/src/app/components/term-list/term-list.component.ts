import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Domain, Entry, User } from '../../models';
import { GlossaryService } from '../../services/glossary.service';
import { TermDialogComponent } from '../term-dialog/term-dialog.component';

@Component({
  selector: 'app-term-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TermDialogComponent],
  templateUrl: './term-list.component.html',
  styleUrl: './term-list.component.scss',
})
export class TermListComponent implements OnInit {
  @Output() entrySelected = new EventEmitter<Entry>();
  @Output() termSelected = new EventEmitter<Entry[]>();
  @Output() termCreated = new EventEmitter<Entry>();

  entries: Entry[] = [];
  groupedTerms: { [termId: number]: Entry[] } = {};
  domains: Domain[] = [];
  users: User[] = [];
  isLoading: boolean = false;
  selectedEntry: Entry | null = null;
  showCreateDialog: boolean = false;

  searchControl = new FormControl('');
  domainControl = new FormControl('');
  authorControl = new FormControl('');
  sortControl = new FormControl('term__text_normalized');

  constructor(private glossaryService: GlossaryService) {}

  ngOnInit(): void {
    this.loadDomains();
    this.loadUsers();
    this.loadEntries();

    // Search with debounce
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => this.loadEntries());

    // Other filters trigger immediate search
    this.domainControl.valueChanges.subscribe(() => this.loadEntries());
    this.authorControl.valueChanges.subscribe(() => this.loadEntries());
    this.sortControl.valueChanges.subscribe(() => this.loadEntries());
  }

  loadDomains(): void {
    this.glossaryService.getDomains().subscribe({
      next: (response) => {
        this.domains = response.results;
      },
      error: (error) => {
        console.error('Failed to load domains:', error);
      },
    });
  }

  loadUsers(): void {
    this.glossaryService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
      },
      error: (error) => {
        console.error('Failed to load users:', error);
      },
    });
  }

  loadEntries(): void {
    this.isLoading = true;
    const filters: any = {};

    if (this.searchControl.value) {
      filters.search = this.searchControl.value;
    }

    if (this.domainControl.value) {
      filters.domain = this.domainControl.value;
    }

    if (this.authorControl.value) {
      filters.author = this.authorControl.value;
    }

    if (this.sortControl.value) {
      filters.ordering = this.sortControl.value;
    }

    this.glossaryService.getEntries(filters).subscribe({
      next: (response) => {
        this.entries = response.results;
        this.groupEntriesByTerm();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load entries:', error);
        this.isLoading = false;
      },
    });
  }

  selectEntry(entry: Entry): void {
    this.selectedEntry = entry;
    this.entrySelected.emit(entry);
    // Also emit termSelected with all entries for this term to populate termEntries
    const termId = entry.term.id;
    const allEntriesForTerm = this.groupedTerms[termId] || [];
    this.termSelected.emit(allEntriesForTerm);
  }

  selectTerm(termEntries: Entry[]): void {
    this.selectedEntry = termEntries[0];
    this.termSelected.emit(termEntries);
  }

  clearFilters(): void {
    this.searchControl.setValue('');
    this.domainControl.setValue('');
    this.authorControl.setValue('');
    this.sortControl.setValue('term__text_normalized');
  }

  getFilterCount(): number {
    let count = 0;
    if (this.searchControl.value) count++;
    if (this.domainControl.value) count++;
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

  groupEntriesByTerm(): void {
    this.groupedTerms = {};
    this.entries.forEach(entry => {
      const termId = entry.term.id;
      if (!this.groupedTerms[termId]) {
        this.groupedTerms[termId] = [];
      }
      this.groupedTerms[termId].push(entry);
    });
  }

  getGroupedTermsArray(): Entry[][] {
    return Object.values(this.groupedTerms);
  }

  getFirstEntryForTerm(termEntries: Entry[]): Entry {
    // Return the first entry (could be sorted by domain priority in the future)
    return termEntries[0];
  }

  selectEntryByDomain(entry: Entry): void {
    this.selectEntry(entry);
    // Also emit termSelected with all entries for this term to populate termEntries
    const termId = entry.term.id;
    const allEntriesForTerm = this.groupedTerms[termId] || [];
    this.termSelected.emit(allEntriesForTerm);
  }

  hasAnyEndorsedEntry(termEntries: Entry[]): boolean {
    return termEntries.some(entry => entry.active_version?.is_endorsed);
  }
}
