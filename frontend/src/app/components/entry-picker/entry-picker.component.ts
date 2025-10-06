import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  OnChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Entry, PaginatedResponse } from '../../models';
import { GlossaryService } from '../../services/glossary.service';

@Component({
  selector: 'app-entry-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './entry-picker.component.html',
  styleUrls: ['./entry-picker.component.scss'],
})
export class EntryPickerComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() entrySelected = new EventEmitter<Entry>();

  entries: Entry[] = [];
  filteredEntries: Entry[] = [];
  searchTerm = '';
  loading = false;
  error: string | null = null;

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

  loadEntries() {
    this.loading = true;
    this.error = null;
    this.searchTerm = '';

    this.glossaryService.getEntries().subscribe({
      next: (response: PaginatedResponse<Entry>) => {
        this.entries = response.results;
        this.filteredEntries = [...this.entries];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading entries:', error);
        this.error = 'Failed to load entries';
        this.loading = false;
      },
    });
  }

  onSearchChange() {
    if (!this.searchTerm.trim()) {
      this.filteredEntries = [...this.entries];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredEntries = this.entries.filter(
      (entry) =>
        entry.term.text.toLowerCase().includes(term) ||
        entry.domain.name.toLowerCase().includes(term) ||
        (entry.active_version?.content &&
          entry.active_version.content.toLowerCase().includes(term)),
    );
  }

  selectEntry(entry: Entry) {
    this.entrySelected.emit(entry);
    this.close.emit();
  }

  onCancel() {
    this.close.emit();
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.onCancel();
    }
  }
}
