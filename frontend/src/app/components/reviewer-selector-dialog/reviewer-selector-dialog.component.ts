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
  @Input() draftAuthorId?: number; // ID of the draft author to exclude
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<number[]>();

  searchTerm = '';
  filteredUsers: User[] = [];

  ngOnInit() {
    this.filteredUsers = this.getAvailableUsers();
  }

  ngOnChanges() {
    this.filteredUsers = this.getAvailableUsers();
    this.searchTerm = '';
  }

  onSearchChange() {
    const availableUsers = this.getAvailableUsers();
    if (!this.searchTerm.trim()) {
      this.filteredUsers = availableUsers;
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredUsers = availableUsers.filter(
        (user) =>
          user.first_name?.toLowerCase().includes(term) ||
          user.last_name?.toLowerCase().includes(term) ||
          user.username.toLowerCase().includes(term),
      );
    }
  }

  private getAvailableUsers(): User[] {
    // Filter out the draft author from the list of available reviewers
    return this.users.filter(user => user.id !== this.draftAuthorId);
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
