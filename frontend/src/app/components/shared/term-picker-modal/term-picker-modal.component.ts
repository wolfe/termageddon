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
import { Term, PaginatedResponse } from '../../../models';
import { of, Subject, debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs';

@Component({
    selector: 'app-term-picker-modal',
    imports: [FormsModule],
    standalone: true,
    template: `
    @if (isOpen) {
      <div class="modal-overlay" (click)="onClose()">
        <div class="modal-dialog" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Select Term</h2>
            <button class="close-button" (click)="onClose()" type="button">
              <span>&times;</span>
            </button>
          </div>
          <div class="modal-body">
            <!-- Search Input -->
            <div class="search-container">
              <input
                type="text"
                [(ngModel)]="searchText"
                (input)="onSearchChange()"
                placeholder="Search terms..."
                class="search-input"
                #searchInput
                />
              @if (searchText) {
                <button (click)="clearSearch()" class="clear-button" type="button">
                  ✕
                </button>
              }
            </div>
            <!-- Loading Indicator -->
            @if (isLoading) {
              <div class="loading-indicator">Loading terms...</div>
            }
            <!-- Term List -->
            @if (!isLoading) {
              <div class="term-list">
                @for (term of terms; track trackByTermId($index, term)) {
                  <div
                    class="term-item"
                    (click)="selectTerm(term)"
                    [class.selected]="selectedTermId === term.id"
                    >
                    <div class="term-text">{{ term.text }}</div>
                    @if (term.is_official) {
                      <div class="term-meta">
                        <span class="official-badge">Official</span>
                      </div>
                    }
                  </div>
                }
                <!-- Create New Option -->
                @if (showCreateNewOption) {
                  <div class="term-item create-new" (click)="createNewTerm()">
                    <div class="term-text">
                      <em>Create new term: "{{ searchText }}"</em>
                    </div>
                  </div>
                }
                <!-- No Results -->
                @if (terms.length === 0 && !showCreateNewOption && !isLoading) {
                  <div
                    class="no-results"
                    >
                    @if (searchText) {
                      <div>
                        No terms found matching "{{ searchText }}"
                      </div>
                    } @else {
                      No terms available
                    }
                  </div>
                }
                <!-- Load More Button -->
                @if (hasNextPage && !isLoading) {
                  <div class="load-more-container">
                    <button
                      type="button"
                      class="btn btn-secondary load-more-btn"
                      (click)="loadMoreTerms()"
                      [disabled]="isLoadingMore"
                      >
                      {{ isLoadingMore ? 'Loading...' : 'Load More Terms' }}
                    </button>
                  </div>
                }
              </div>
            }
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="onClose()">Cancel</button>
          </div>
        </div>
      </div>
    }
    `,
    styleUrls: ['./term-picker-modal.component.scss']
})
export class TermPickerModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() selectedTermId: number | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() termSelected = new EventEmitter<{ termId: number | null; termText: string }>();

  searchText = '';
  terms: Term[] = [];
  isLoading = false;
  isLoadingMore = false;
  hasNextPage = false;
  nextPageUrl: string | null = null;
  showCreateNewOption = false;

  private searchSubject = new Subject<string>();
  private currentSearch = '';

  constructor(private glossaryService: GlossaryService) {}

  ngOnInit(): void {
    // Set up debounced search
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(searchTerm => {
          this.currentSearch = searchTerm;
          this.isLoading = true;
          return this.glossaryService.getTerms(searchTerm, 50).pipe(
            catchError(error => {
              console.error('Error searching terms:', error);
              return of({ results: [], count: 0, next: null, previous: null });
            })
          );
        })
      )
      .subscribe(response => {
        this.handleSearchResponse(response);
      });

    // Load initial terms
    this.loadInitialTerms();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.resetSearch();
      // Focus search input when modal opens
      setTimeout(() => {
        const searchInput = document.querySelector('.search-input') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }, 100);
    }
  }

  private loadInitialTerms(): void {
    this.isLoading = true;
    this.glossaryService.getTerms('', 50).subscribe({
      next: response => {
        this.handleSearchResponse(response);
      },
      error: error => {
        console.error('Error loading initial terms:', error);
        this.isLoading = false;
      },
    });
  }

  private handleSearchResponse(response: PaginatedResponse<Term>): void {
    this.terms = response.results;
    this.hasNextPage = !!response.next;
    this.nextPageUrl = response.next;
    this.isLoading = false;
    this.isLoadingMore = false;

    // Determine if we should show "create new" option
    this.updateCreateNewOption();
  }

  private updateCreateNewOption(): void {
    if (this.currentSearch && this.currentSearch.trim()) {
      const exactMatch = this.terms.some(
        term => term.text.toLowerCase() === this.currentSearch.toLowerCase()
      );
      this.showCreateNewOption = !exactMatch;
    } else {
      this.showCreateNewOption = false;
    }
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchText);
  }

  clearSearch(): void {
    this.searchText = '';
    this.searchSubject.next('');
  }

  loadMoreTerms(): void {
    if (!this.nextPageUrl || this.isLoadingMore) {
      return;
    }

    this.isLoadingMore = true;
    this.glossaryService.getTermsFromUrl(this.nextPageUrl).subscribe({
      next: response => {
        this.terms = [...this.terms, ...response.results];
        this.hasNextPage = !!response.next;
        this.nextPageUrl = response.next;
        this.isLoadingMore = false;
      },
      error: error => {
        console.error('Error loading more terms:', error);
        this.isLoadingMore = false;
      },
    });
  }

  selectTerm(term: Term): void {
    this.termSelected.emit({ termId: term.id, termText: term.text });
    this.onClose();
  }

  createNewTerm(): void {
    this.termSelected.emit({ termId: null, termText: this.searchText });
    this.onClose();
  }

  onClose(): void {
    this.close.emit();
  }

  private resetSearch(): void {
    this.searchText = '';
    this.currentSearch = '';
    this.showCreateNewOption = false;
    this.loadInitialTerms();
  }

  trackByTermId(index: number, term: Term): number {
    return term.id;
  }
}
