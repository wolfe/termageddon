import { Component, Input, Output, EventEmitter, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { User } from '../../../models';

export interface FilterConfig {
  id: string;
  label: string;
  type: 'checkbox' | 'select' | 'text';
  options?: { value: any; label: string }[];
  value?: any;
}

export interface Perspective {
  id: number;
  name: string;
}

export interface SortOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-search-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-filter-bar.component.html',
  styleUrl: './search-filter-bar.component.scss'
})
export class SearchFilterBarComponent implements OnInit, OnDestroy {
  @Input() placeholder: string = 'Search...';
  @Input() filters: FilterConfig[] = [];
  @Input() showClearButton: boolean = true;
  @Input() searchTerm: string = '';
  @Input() loading: boolean = false;
  
  // Debouncing for search input
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  
  // New unified filter inputs
  @Input() showPerspectiveFilter: boolean = false;
  @Input() perspectives: Perspective[] = [];
  @Input() selectedPerspectiveId: number | null = null;
  
  @Input() showAuthorFilter: boolean = false;
  @Input() authors: User[] = [];
  @Input() selectedAuthorId: number | null = null;
  
  @Input() showSortOptions: boolean = false;
  @Input() sortOptions: SortOption[] = [];
  @Input() selectedSortBy: string = '';

  @Output() search = new EventEmitter<string>();
  @Output() searchTermChange = new EventEmitter<string>();
  @Output() filterChanged = new EventEmitter<{ filterId: string; value: any }>();
  @Output() cleared = new EventEmitter<void>();
  
  // New unified filter outputs
  @Output() perspectiveChanged = new EventEmitter<number | null>();
  @Output() authorChanged = new EventEmitter<number | null>();
  @Output() sortChanged = new EventEmitter<string>();

  ngOnInit(): void {
    // Set up debounced search
    this.searchSubject
      .pipe(
        debounceTime(300), // Wait 300ms after user stops typing
        distinctUntilChanged(), // Only emit if the value has changed
        takeUntil(this.destroy$)
      )
      .subscribe(searchTerm => {
        this.search.emit(searchTerm);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchInput(): void {
    this.searchTermChange.emit(this.searchTerm);
    this.searchSubject.next(this.searchTerm);
  }

  onCheckboxChange(filterId: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    this.filterChanged.emit({ filterId, value: target.checked });
  }

  onSelectChange(filterId: string, event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.filterChanged.emit({ filterId, value: target.value });
  }

  onTextChange(filterId: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    this.filterChanged.emit({ filterId, value: target.value });
  }

  onClear(): void {
    this.searchTerm = '';
    this.searchTermChange.emit(this.searchTerm);
    this.searchSubject.next(this.searchTerm);
    this.cleared.emit();
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      // For Enter key, trigger search immediately without debouncing
      this.search.emit(this.searchTerm);
    }
  }

  onPerspectiveChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const value = target.value === '' ? null : parseInt(target.value, 10);
    this.selectedPerspectiveId = value;
    this.perspectiveChanged.emit(value);
  }

  onAuthorChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const value = target.value === '' ? null : parseInt(target.value, 10);
    this.selectedAuthorId = value;
    this.authorChanged.emit(value);
  }

  onSortChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedSortBy = target.value;
    this.sortChanged.emit(target.value);
  }
}
