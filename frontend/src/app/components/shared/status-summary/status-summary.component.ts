import { Component, Input } from '@angular/core';


export interface StatusSummaryItem {
  count: number;
  label: string;
  color: string;
}

@Component({
    selector: 'app-status-summary',
    imports: [],
    standalone: true,
    template: `
    @if (items.length > 0) {
      <div class="p-3 border-b border-gray-300">
        <div class="flex items-center space-x-4 text-xs">
          @for (item of items; track item.label) {
            <span class="flex items-center">
              <span class="w-2 h-2 rounded-full mr-1" [style.background-color]="item.color"></span>
              {{ item.count }} {{ item.label }}
            </span>
          }
        </div>
      </div>
    }
  `
})
export class StatusSummaryComponent {
  @Input() items: StatusSummaryItem[] = [];
}
