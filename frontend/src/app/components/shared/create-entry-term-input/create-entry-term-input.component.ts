import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  SimpleChanges,
  HostListener,
  ElementRef,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GlossaryService } from '../../../services/glossary.service';
import { Term, PaginatedResponse } from '../../../models';
import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  catchError,
  of,
} from 'rxjs';

const PAGE_SIZE = 20;
const SCROLL_LOAD_THRESHOLD_PX = 50;

@Component({
  selector: 'app-create-entry-term-input',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './create-entry-term-input.component.html',
  styleUrl: './create-entry-term-input.component.scss',
})
export class CreateEntryTermInputComponent implements OnChanges, AfterViewInit {
  @Input() selectedTermId: number | null = null;
  @Input() selectedTermText = '';
  @Input() disabled = false;

  @Output() termSelected = new EventEmitter<{
    termId: number | null;
    termText: string;
  }>();

  @Output() cancel = new EventEmitter<void>();

  @ViewChild('dropdownList') dropdownListRef?: ElementRef<HTMLDivElement>;

  displayText = '';
  isDropdownOpen = false;
  terms: Term[] = [];
  isLoading = false;
  isLoadingMore = false;
  hasNextPage = false;
  nextPageUrl: string | null = null;
  showAddNewOption = false;

  private searchSubject = new Subject<string>();
  private currentSearch = '';

  constructor(
    private glossaryService: GlossaryService,
    private elementRef: ElementRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['selectedTermId'] ||
      changes['selectedTermText']
    ) {
      this.displayText = this.selectedTermText ?? '';
    }
  }

  ngAfterViewInit(): void {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(searchTerm => {
          this.currentSearch = searchTerm;
          this.isLoading = true;
          return this.glossaryService
            .getTerms(searchTerm.trim() || undefined, PAGE_SIZE)
            .pipe(
              catchError(() =>
                of({
                  results: [],
                  count: 0,
                  next: null,
                  previous: null,
                } as PaginatedResponse<Term>)
              )
            );
        })
      )
      .subscribe(response => this.applySearchResponse(response));
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (
      this.isDropdownOpen &&
      !this.elementRef.nativeElement.contains(event.target)
    ) {
      this.closeDropdownAndEmitCancel();
    }
  }

  onInputFocus(): void {
    this.isDropdownOpen = true;
    const q = this.displayText.trim();
    if (0 < q.length) {
      this.searchSubject.next(q);
    } else {
      this.terms = [];
      this.isLoading = false;
      this.showAddNewOption = false;
    }
  }

  onInputChange(): void {
    this.isDropdownOpen = true;
    this.searchSubject.next(this.displayText.trim());
  }

  onDropdownScroll(): void {
    const el = this.dropdownListRef?.nativeElement;
    if (
      !el ||
      this.isLoadingMore ||
      !this.hasNextPage ||
      !this.nextPageUrl
    ) {
      return;
    }
    const { scrollTop, clientHeight, scrollHeight } = el;
    if (scrollTop + clientHeight >= scrollHeight - SCROLL_LOAD_THRESHOLD_PX) {
      this.loadMore();
    }
  }

  selectTerm(term: Term): void {
    this.displayText = term.text;
    this.isDropdownOpen = false;
    this.termSelected.emit({ termId: term.id, termText: term.text });
  }

  selectAddNew(): void {
    const text = this.displayText.trim();
    if (0 < text.length) {
      this.isDropdownOpen = false;
      this.termSelected.emit({ termId: null, termText: text });
    }
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
  }

  private closeDropdownAndEmitCancel(): void {
    this.isDropdownOpen = false;
    this.cancel.emit();
  }

  trackByTermId(_index: number, term: Term): number {
    return term.id;
  }

  private applySearchResponse(response: PaginatedResponse<Term>): void {
    this.terms = response.results;
    this.hasNextPage = !!response.next;
    this.nextPageUrl = response.next;
    this.isLoading = false;
    this.isLoadingMore = false;
    this.updateAddNewOption();
  }

  private updateAddNewOption(): void {
    const search = this.currentSearch.trim();
    if (0 >= search.length) {
      this.showAddNewOption = false;
      return;
    }
    const exactMatch = this.terms.some(
      t => t.text.toLowerCase() === search.toLowerCase()
    );
    this.showAddNewOption = !exactMatch;
  }

  private loadMore(): void {
    if (!this.nextPageUrl || this.isLoadingMore) return;
    this.isLoadingMore = true;
    this.glossaryService.getTermsFromUrl(this.nextPageUrl).subscribe({
      next: response => {
        this.terms = [...this.terms, ...response.results];
        this.hasNextPage = !!response.next;
        this.nextPageUrl = response.next;
        this.isLoadingMore = false;
      },
      error: () => {
        this.isLoadingMore = false;
      },
    });
  }
}
