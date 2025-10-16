import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { Entry } from '../../models';
import { GlossaryService } from '../../services/glossary.service';
import { UrlHelperService } from '../../services/url-helper.service';
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
export class GlossaryViewComponent implements OnInit {
  selectedEntry: Entry | null = null;
  selectedTermEntries: Entry[] = [];
  isEditMode: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private glossaryService: GlossaryService,
    private urlHelper: UrlHelperService
  ) {}

  ngOnInit(): void {
    // Subscribe to route parameters
    this.route.queryParams.subscribe(params => {
      const entryId = params['entryId'];
      const editMode = params['edit'] === 'true';
      
      if (entryId) {
        this.loadEntryById(+entryId, editMode);
      }
    });
  }

  private loadEntryById(entryId: number, editMode: boolean = false): void {
    this.glossaryService.getEntryById(entryId).subscribe({
      next: (entry) => {
        this.selectedEntry = entry;
        this.isEditMode = editMode;
        this.updateUrl(entry);
        // Load all entries for this term to show correct perspective pills
        this.loadTermEntries(entry.term.id);
      },
      error: (error) => {
        console.error('Failed to load entry:', error);
        // Navigate back to glossary without specific entry
        this.router.navigate(['/glossary']);
      }
    });
  }

  private loadTermEntries(termId: number): void {
    this.glossaryService.getEntries({ term: termId }).subscribe({
      next: (response) => {
        this.selectedTermEntries = response.results;
      },
      error: (error) => {
        console.error('Failed to load term entries:', error);
        // Fallback: just use the current entry
        this.selectedTermEntries = this.selectedEntry ? [this.selectedEntry] : [];
      }
    });
  }

  private updateUrl(entry: Entry): void {
    const url = this.urlHelper.buildEntryUrl(entry.id, entry, true);
    this.location.replaceState(url);
  }

  onEntrySelected(entry: Entry): void {
    console.log('onEntrySelected called with entry:', entry);
    this.selectedEntry = entry;
    this.isEditMode = false;
    this.updateUrl(entry);
    // Load all entries for this term to show correct perspective pills
    this.loadTermEntries(entry.term.id);
    console.log('selectedEntry set to:', this.selectedEntry);
  }

  onTermSelected(termEntries: Entry[]): void {
    console.log('onTermSelected called with entries:', termEntries);
    this.selectedTermEntries = [...termEntries]; // Create new array reference
    // Only set selectedEntry to first perspective if no specific entry is already selected
    if (!this.selectedEntry || !termEntries.find(e => e.id === this.selectedEntry?.id)) {
      this.selectedEntry = termEntries[0]; // Select first perspective by default
      this.updateUrl(this.selectedEntry);
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
