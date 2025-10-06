import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from '../../models';

@Component({
  selector: 'app-reviewer-selector-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reviewer-selector-dialog.component.html',
  styleUrls: ['./reviewer-selector-dialog.component.scss'],
})
export class ReviewerSelectorDialogComponent implements OnInit {
  @Input() isOpen = false;
  @Input() users: User[] = [];
  @Input() selectedReviewerIds: number[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<number[]>();

  searchTerm = '';
  filteredUsers: User[] = [];

  ngOnInit() {
    this.filteredUsers = this.users;
  }

  ngOnChanges() {
    this.filteredUsers = this.users;
    this.searchTerm = '';
  }

  onSearchChange() {
    if (!this.searchTerm.trim()) {
      this.filteredUsers = this.users;
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredUsers = this.users.filter(
        (user) =>
          user.first_name?.toLowerCase().includes(term) ||
          user.last_name?.toLowerCase().includes(term) ||
          user.username.toLowerCase().includes(term),
      );
    }
  }

  isSelected(userId: number): boolean {
    return this.selectedReviewerIds.includes(userId);
  }

  toggleSelection(userId: number) {
    if (this.isSelected(userId)) {
      this.selectedReviewerIds = this.selectedReviewerIds.filter(
        (id) => id !== userId,
      );
    } else {
      this.selectedReviewerIds = [...this.selectedReviewerIds, userId];
    }
  }

  onConfirm() {
    this.confirm.emit(this.selectedReviewerIds);
    this.close.emit();
  }

  onCancel() {
    this.close.emit();
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.onCancel();
    }
  }
}
