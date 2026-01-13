import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  OnChanges,
  SimpleChanges,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { GlossaryService } from '../../../services/glossary.service';
import { Term } from '../../../models';
import { TermPickerModalComponent } from '../term-picker-modal/term-picker-modal.component';

@Component({
    selector: 'app-term-autocomplete',
    imports: [FormsModule, TermPickerModalComponent],
    styleUrl: './term-autocomplete.component.scss',
    standalone: true,
    template: `
    <div class="term-autocomplete">
      <div class="input-container">
        <input
          type="text"
          [(ngModel)]="displayText"
          placeholder="Search or create term..."
          readonly
          class="term-input"
          (click)="openPicker()"
          [disabled]="disabled"
        />
      </div>

      <app-term-picker-modal
        [isOpen]="showPicker"
        [selectedTermId]="selectedTermId"
        (close)="closePicker()"
        (termSelected)="onTermSelected($event)"
      ></app-term-picker-modal>
    </div>
  `
})
export class TermAutocompleteComponent implements OnInit, OnChanges {
  @Input() selectedTermId: number | null = null;
  @Input() isOpen: boolean = false;
  @Input() disabled: boolean = false;
  @Output() termSelected = new EventEmitter<{ termId: number | null; termText: string }>();

  displayText = '';
  showPicker = false;
  allTerms: Term[] = [];

  constructor(private glossaryService: GlossaryService) {}

  ngOnInit(): void {
    this.loadTerms();
    this.updateDisplayText();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedTermId']) {
      this.updateDisplayText();
    }
    // Note: Removed the reset logic when dialog opens as it was interfering with term selection
  }

  private loadTerms(): void {
    this.glossaryService.getAllTerms().subscribe({
      next: (terms: Term[]) => {
        this.allTerms = terms;
      },
      error: (error: any) => {
        console.error('Failed to load terms:', error);
      },
    });
  }

  private updateDisplayText(): void {
    if (this.selectedTermId) {
      const term = this.allTerms.find(t => t.id === this.selectedTermId);
      this.displayText = term ? term.text : '';
    } else {
      this.displayText = '';
    }
  }

  openPicker(): void {
    this.showPicker = true;
  }

  closePicker(): void {
    this.showPicker = false;
  }

  onTermSelected(event: { termId: number | null; termText: string }): void {
    this.selectedTermId = event.termId;
    this.displayText = event.termText;
    this.termSelected.emit(event);
  }
}
