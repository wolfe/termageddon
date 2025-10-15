import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReviewDraft } from '../../../models';
import { PerspectivePillComponent } from '../perspective-pill/perspective-pill.component';
import { getDraftStatus, getDraftStatusClass, getEligibilityText, getEligibilityClass, canPublish as canPublishUtil } from '../../../utils/draft-status.util';
import { getInitials, getUserDisplayName } from '../../../utils/user.util';

@Component({
  selector: 'app-draft-list-item',
  standalone: true,
  imports: [CommonModule, PerspectivePillComponent],
  templateUrl: './draft-list-item.component.html',
  styleUrl: './draft-list-item.component.scss'
})
export class DraftListItemComponent {
  @Input() draft!: ReviewDraft;
  @Input() selected: boolean = false;
  @Input() showStatus: boolean = true;
  @Input() statusType: 'draft' | 'eligibility' = 'draft';
  @Input() showPublishButton: boolean = false;
  @Input() showApprovalStatus: boolean = false;
  @Input() context: 'review' | 'my-drafts' = 'review';

  @Output() clicked = new EventEmitter<ReviewDraft>();
  @Output() publishClicked = new EventEmitter<ReviewDraft>();

  // Utility functions
  getDraftStatus = getDraftStatus;
  getDraftStatusClass = getDraftStatusClass;
  getEligibilityText = getEligibilityText;
  getEligibilityClass = getEligibilityClass;
  canPublish = canPublishUtil;
  getInitials = getInitials;
  getUserDisplayName = getUserDisplayName;

  onItemClick(): void {
    this.clicked.emit(this.draft);
  }

  onPublishClick(event: Event): void {
    event.stopPropagation();
    this.publishClicked.emit(this.draft);
  }

  getStatusText(): string {
    if (this.statusType === 'eligibility') {
      return this.getEligibilityText(this.draft);
    }
    return this.getDraftStatus(this.draft);
  }

  getStatusClass(): string {
    if (this.statusType === 'eligibility') {
      return this.getEligibilityClass(this.draft);
    }
    return this.getDraftStatusClass(this.draft);
  }

  getItemClass(): string {
    const baseClass = 'p-3 cursor-pointer transition-colors';
    const selectedClass = this.selected ? 'bg-blue-50 border-l-4 border-action-primary' : 'bg-white hover:bg-gray-50';
    const disabledClass = this.draft.approval_status_for_user === 'own_draft' && this.context === 'review' ? 'opacity-60' : '';
    
    return `${baseClass} ${selectedClass} ${disabledClass}`;
  }

  getAuthorTooltip(): string {
    return `${this.getUserDisplayName(this.draft.author)} authored this draft`;
  }

  getApproverTooltip(approver: any): string {
    return `${this.getUserDisplayName(approver)} approved`;
  }

  getReviewerTooltip(reviewer: any): string {
    return `${this.getUserDisplayName(reviewer)} requested to review`;
  }
}
