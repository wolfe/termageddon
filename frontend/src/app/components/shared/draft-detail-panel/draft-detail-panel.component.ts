import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReviewDraft, Comment } from '../../../models';
import { CommentThreadComponent } from '../../comment-thread/comment-thread.component';
import { UserAvatarComponent } from '../user-avatar/user-avatar.component';
import { getDraftStatus, getDraftStatusClass, getApprovalStatusText, getEligibilityText, getEligibilityClass, getApprovalReason, canPublish as canPublishUtil, canApprove as canApproveUtil, getRemainingApprovals, getApprovalAccessLevel } from '../../../utils/draft-status.util';
import { getInitials, getUserDisplayName } from '../../../utils/user.util';

@Component({
  selector: 'app-draft-detail-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, CommentThreadComponent, UserAvatarComponent],
  templateUrl: './draft-detail-panel.component.html',
  styleUrl: './draft-detail-panel.component.scss'
})
export class DraftDetailPanelComponent implements OnInit {
  @Input() draft: ReviewDraft | null = null;
  @Input() canEdit: boolean = false;
  @Input() canPublishFlag: boolean = false;
  @Input() canApproveFlag: boolean = false;
  @Input() showPublishButton: boolean = true;
  @Input() showRequestReviewButton: boolean = true;
  @Input() showApproveButton: boolean = true;
  @Input() isLoadingComments: boolean = false;
  @Input() comments: Comment[] = [];
  @Input() requestingReview: boolean = false;
  @Input() editingDraft: ReviewDraft | null = null;
  @Input() editContent: string = '';
  @Input() currentUserId?: number;

  @Output() approve = new EventEmitter<void>();
  @Output() publish = new EventEmitter<void>();
  @Output() requestReview = new EventEmitter<void>();
  @Output() edit = new EventEmitter<void>();
  @Output() saveEdit = new EventEmitter<string>();
  @Output() cancelEdit = new EventEmitter<void>();
  @Output() commentAdded = new EventEmitter<Comment>();
  @Output() commentResolved = new EventEmitter<Comment>();
  @Output() commentUnresolved = new EventEmitter<Comment>();

  ngOnInit(): void {
    // Component initialization
  }

  // Utility functions
  getDraftStatus = getDraftStatus;
  getDraftStatusClass = getDraftStatusClass;
  getApprovalStatusText = getApprovalStatusText;
  getEligibilityText = getEligibilityText;
  getEligibilityClass = getEligibilityClass;
  getApprovalReason = getApprovalReason;
  canPublishUtil = canPublishUtil;
  canApproveUtil = canApproveUtil;
  getRemainingApprovals = getRemainingApprovals;
  getApprovalAccessLevel = getApprovalAccessLevel;
  getInitials = getInitials;
  getUserDisplayName = getUserDisplayName;

  onApprove(): void {
    this.approve.emit();
  }

  onPublish(): void {
    this.publish.emit();
  }

  onRequestReview(): void {
    this.requestReview.emit();
  }

  onEdit(): void {
    this.edit.emit();
  }

  onSaveEdit(): void {
    this.saveEdit.emit(this.editContent);
  }

  onCancelEdit(): void {
    this.cancelEdit.emit();
  }

  onCommentAdded(comment: Comment): void {
    this.commentAdded.emit(comment);
  }

  onCommentResolved(comment: Comment): void {
    this.commentResolved.emit(comment);
  }

  onCommentUnresolved(comment: Comment): void {
    this.commentUnresolved.emit(comment);
  }

  isEditing(): boolean {
    return this.editingDraft?.id === this.draft?.id;
  }

  getActionButtonText(): string {
    if (!this.draft) return '';
    
    const status = this.getApprovalAccessLevel(this.draft);
    switch (status) {
      case 'can_approve':
        return 'Approve';
      case 'own_draft':
        return 'Request Review';
      case 'already_approved':
        return 'Request Additional Reviewers';
      case 'already_approved_by_others':
        return 'Request Additional Reviewers';
      default:
        return 'Request Review';
    }
  }

  getActionButtonClass(): string {
    if (!this.draft) return '';
    
    const status = this.getApprovalAccessLevel(this.draft);
    switch (status) {
      case 'can_approve':
        return 'px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 text-sm font-medium';
      case 'own_draft':
        return 'px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium';
      default:
        return 'px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400 text-sm font-medium';
    }
  }
}
