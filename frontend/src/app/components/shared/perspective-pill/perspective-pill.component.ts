import { Component, Input, Output, EventEmitter } from '@angular/core';

import { Perspective } from '../../../models';

@Component({
    selector: 'app-perspective-pill',
    imports: [],
    standalone: true,
    template: `
    <span
      [class]="getPillClasses()"
      [title]="perspective.description || perspective.name"
      (click)="onClick()"
    >
      {{ getDisplayText() }}
    </span>
  `,
    styleUrls: ['./perspective-pill.component.scss']
})
export class PerspectivePillComponent {
  @Input() perspective!: Perspective;
  @Input() size: 'small' | 'medium' = 'medium';
  @Input() variant: 'default' | 'selected' | 'unselected' | 'tab-selected' | 'tab-unselected' =
    'default';
  @Input() clickable: boolean = false;
  @Input() maxLength: number = 0; // 0 means no truncation
  @Output() click = new EventEmitter<void>();

  onClick(): void {
    if (this.clickable) {
      this.click.emit();
    }
  }

  getDisplayText(): string {
    if (this.maxLength > 0 && this.perspective.name.length > this.maxLength) {
      return this.perspective.name.substring(0, this.maxLength) + '...';
    }
    return this.perspective.name;
  }

  getPillClasses(): string {
    const sizeClass =
      this.size === 'small' ? 'perspective-pill--small' : 'perspective-pill--medium';
    const variantClass = `perspective-pill--${this.variant}`;
    const cursorClass = this.clickable
      ? 'perspective-pill--clickable'
      : 'perspective-pill--default';

    return ['perspective-pill', sizeClass, variantClass, cursorClass].join(' ');
  }
}
