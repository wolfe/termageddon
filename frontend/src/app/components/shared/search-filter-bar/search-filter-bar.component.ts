import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface FilterConfig {
  id: string;
  label: string;
  type: 'checkbox' | 'select' | 'text';
  options?: { value: any; label: string }[];
  value?: any;
}

@Component({
  selector: 'app-search-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-filter-bar.component.html',
  styleUrl: './search-filter-bar.component.scss'
})
export class SearchFilterBarComponent {
  @Input() placeholder: string = 'Search...';
  @Input() filters: FilterConfig[] = [];
  @Input() showClearButton: boolean = true;
  @Input() searchTerm: string = '';
  @Input() loading: boolean = false;

  @Output() search = new EventEmitter<string>();
  @Output() filterChanged = new EventEmitter<{ filterId: string; value: any }>();
  @Output() cleared = new EventEmitter<void>();

  onSearchInput(): void {
    this.search.emit(this.searchTerm);
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
    this.cleared.emit();
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.onSearchInput();
    }
  }
}
