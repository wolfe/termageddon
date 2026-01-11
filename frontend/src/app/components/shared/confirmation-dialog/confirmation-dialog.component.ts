import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ConfirmationDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
}

@Component({
    selector: 'app-confirmation-dialog',
    imports: [CommonModule],
    templateUrl: './confirmation-dialog.component.html',
    styleUrls: ['./confirmation-dialog.component.scss']
})
export class ConfirmationDialogComponent {
  @Input() isOpen = false;
  @Input() data: ConfirmationDialogData = {
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'warning',
  };

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onCancel();
    }
  }

  getDialogClass(): string {
    const baseClass = 'confirmation-dialog';
    const typeClass = `dialog-${this.data.type || 'warning'}`;
    return `${baseClass} ${typeClass}`;
  }

  getIconClass(): string {
    switch (this.data.type) {
      case 'danger':
        return '⚠';
      case 'info':
        return 'ℹ';
      case 'warning':
      default:
        return '⚠';
    }
  }

  getConfirmButtonClass(): string {
    switch (this.data.type) {
      case 'danger':
        return 'btn-danger';
      case 'info':
        return 'btn-primary';
      case 'warning':
      default:
        return 'btn-warning';
    }
  }
}
