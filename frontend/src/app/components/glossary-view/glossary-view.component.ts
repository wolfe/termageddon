import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Entry } from '../../models';
import { TermListComponent } from '../term-list/term-list.component';
import { TermDetailComponent } from '../term-detail/term-detail.component';
import { MasterDetailLayoutComponent } from '../shared/master-detail-layout/master-detail-layout.component';
import { StatusSummaryComponent } from '../shared/status-summary/status-summary.component';

@Component({
  selector: 'app-glossary-view',
  standalone: true,
  imports: [CommonModule, TermListComponent, TermDetailComponent, MasterDetailLayoutComponent, StatusSummaryComponent],
  templateUrl: './glossary-view.component.html',
  styleUrl: './glossary-view.component.scss',
})
export class GlossaryViewComponent {
  selectedEntry: Entry | null = null;
  selectedTermEntries: Entry[] = [];
  isEditMode: boolean = false;

  onEntrySelected(entry: Entry): void {
    console.log('onEntrySelected called with entry:', entry);
    this.selectedEntry = entry;
    this.isEditMode = false;
    console.log('selectedEntry set to:', this.selectedEntry);
  }

  onTermSelected(termEntries: Entry[]): void {
    console.log('onTermSelected called with entries:', termEntries);
    this.selectedTermEntries = [...termEntries]; // Create new array reference
    // Only set selectedEntry to first perspective if no specific entry is already selected
    if (!this.selectedEntry || !termEntries.find(e => e.id === this.selectedEntry?.id)) {
      this.selectedEntry = termEntries[0]; // Select first perspective by default
    }
    this.isEditMode = false;
  }

  onEditRequested(): void {
    this.isEditMode = true;
  }

  onEditCancelled(): void {
    this.isEditMode = false;
  }

  onEditSaved(entry: Entry): void {
    console.log('onEditSaved called with entry:', entry);
    console.log('Setting isEditMode to false');
    this.isEditMode = false;
    this.selectedEntry = entry;
    console.log('isEditMode is now:', this.isEditMode);
  }

  onTermCreated(entry: Entry): void {
    // Select the newly created term
    this.selectedEntry = entry;
    this.isEditMode = false;
  }
}
