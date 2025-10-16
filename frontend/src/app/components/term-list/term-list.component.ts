import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Perspective, Entry, User, GroupedEntry } from '../../models';
import { GlossaryService } from '../../services/glossary.service';
import { TermDialogComponent } from '../term-dialog/term-dialog.component';
import { CreateEntryDialogComponent } from '../create-entry-dialog/create-entry-dialog.component';
import { PerspectivePillComponent } from '../shared/perspective-pill/perspective-pill.component';

@Component({
  selector: 'app-term-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TermDialogComponent, CreateEntryDialogComponent, PerspectivePillComponent],
  templateUrl: './term-list.component.html',
  styleUrl: './term-list.component.scss',
})
export class TermListComponent implements OnInit {
  @Output() entrySelected = new EventEmitter<Entry>();
  @Output() termSelected = new EventEmitter<Entry[]>();
  @Output() termCreated = new EventEmitter<Entry>();

  entries: Entry[] = [];
  groupedEntries: GroupedEntry[] = [];
  perspectives: Perspective[] = [];
  users: User[] = [];
  isLoading: boolean = false;
  selectedEntry: Entry | null = null;
  showCreateDialog: boolean = false;

  searchControl = new FormControl('');
  perspectiveControl = new FormControl('');
  authorControl = new FormControl('');
  sortControl = new FormControl('term__text_normalized');

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
      next: (response) => {
        this.perspectives = response.results;
      },
      error: (error) => {
        console.error('Failed to load perspectives:', error);
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

    if (this.perspectiveControl.value) {
      filters.perspective = this.perspectiveControl.value;
    }

    if (this.authorControl.value) {
      filters.author = this.authorControl.value;
    }

    if (this.sortControl.value) {
      filters.ordering = this.sortControl.value;
    }

    // Use new grouped_by_term endpoint instead of client-side grouping
    this.glossaryService.getEntriesGroupedByTerm(filters).subscribe({
      next: (groupedEntries) => {
        this.groupedEntries = groupedEntries;
        // Flatten for backward compatibility
        this.entries = groupedEntries.flatMap(group => group.entries);
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
    this.sortControl.setValue('term__text_normalized');
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
}
