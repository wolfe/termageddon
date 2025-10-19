import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GlossaryService } from '../../services/glossary.service';
import { Perspective, Term, Entry, CreateTermAndEntryRequest } from '../../models';

@Component({
  selector: 'app-term-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './term-dialog.component.html',
  styleUrls: ['./term-dialog.component.scss'],
})
export class TermDialogComponent implements OnInit {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() termCreated = new EventEmitter<Entry>();

  termText = '';
  selectedPerspectiveId: number | null = null;
  isOfficial = false;
  perspectives: Perspective[] = [];
  isLoading = false;
  error: string | null = null;

  constructor(private glossaryService: GlossaryService) {}

  ngOnInit() {
    this.loadPerspectives();
  }

  loadPerspectives() {
    this.glossaryService.getPerspectives().subscribe({
      next: response => {
        this.perspectives = response.results;
      },
      error: error => {
        console.error('Error loading perspectives:', error);
        this.error = 'Failed to load perspectives';
      },
    });
  }

  onClose() {
    this.resetForm();
    this.close.emit();
  }

  onSave() {
    if (!this.termText.trim() || !this.selectedPerspectiveId) {
      this.error = 'Please enter a term and select a perspective';
      return;
    }

    this.isLoading = true;
    this.error = null;

    // Use new atomic create_with_term endpoint instead of separate calls
    const request: CreateTermAndEntryRequest = {
      term_text: this.termText.trim(),
      perspective_id: this.selectedPerspectiveId,
      is_official: this.isOfficial,
    };

    this.glossaryService.createTermAndEntry(request).subscribe({
      next: entry => {
        this.isLoading = false;
        this.termCreated.emit(entry);
        this.resetForm();
        this.close.emit();
      },
      error: error => {
        this.isLoading = false;
        this.error = 'Failed to create term and entry: ' + (error.error?.detail || error.message);
      },
    });
  }

  private resetForm() {
    this.termText = '';
    this.selectedPerspectiveId = null;
    this.isOfficial = false;
    this.error = null;
  }
}
