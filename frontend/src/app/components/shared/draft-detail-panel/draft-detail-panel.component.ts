import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReviewDraft, Comment, EntryDraft, User } from '../../../models';
import { CommentThreadComponent } from '../../comment-thread/comment-thread.component';
import { UserAvatarComponent } from '../user-avatar/user-avatar.component';
import { PerspectivePillComponent } from '../perspective-pill/perspective-pill.component';
import { DefinitionFormComponent } from '../../definition-form/definition-form.component';
import { VersionHistorySidebarComponent } from '../version-history-sidebar/version-history-sidebar.component';
import { EntryDetailService } from '../../../services/entry-detail.service';
import { PermissionService } from '../../../services/permission.service';
import { NotificationService } from '../../../services/notification.service';
import { getDraftStatus, getDraftStatusClass, getApprovalStatusText, getEligibilityText, getEligibilityClass, getApprovalReason, canPublish as canPublishUtil, canApprove as canApproveUtil, getRemainingApprovals, getApprovalAccessLevel } from '../../../utils/draft-status.util';
import { getInitials, getUserDisplayName } from '../../../utils/user.util';

@Component({
  selector: 'app-draft-detail-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, CommentThreadComponent, UserAvatarComponent, PerspectivePillComponent, DefinitionFormComponent, VersionHistorySidebarComponent],
  templateUrl: './draft-detail-panel.component.html',
  styleUrl: './draft-detail-panel.component.scss'
})
export class DraftDetailPanelComponent implements OnInit, OnChanges {
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
  @Input() entryId?: number;
  @Input() currentUserId?: number;

  @Output() approve = new EventEmitter<void>();
  @Output() publish = new EventEmitter<void>();
  @Output() requestReview = new EventEmitter<void>();
  @Output() editRequested = new EventEmitter<void>();
  @Output() editSaved = new EventEmitter<void>();
  @Output() editCancelled = new EventEmitter<void>();
  @Output() commentAdded = new EventEmitter<Comment>();
  @Output() commentResolved = new EventEmitter<Comment>();
  @Output() commentUnresolved = new EventEmitter<Comment>();

  // Edit state
  isEditMode: boolean = false;
  editContent: string = '';

  // Version history state
  showVersionHistory: boolean = false;
  draftHistory: EntryDraft[] = [];
  selectedHistoricalDraft: EntryDraft | null = null;
  latestDraft: EntryDraft | null = null;

  constructor(
    private entryDetailService: EntryDetailService,
    private permissionService: PermissionService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    // Load draft history when draft is selected
    if (this.draft?.entry?.id) {
      this.loadDraftHistory();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['draft'] && this.draft) {
      this.loadDraftHistory();
      // Reset historical draft selection when switching drafts
      this.selectedHistoricalDraft = null;
    }
  }

  loadDraftHistory(): void {
    if (!this.draft?.entry?.id) return;
    
    this.entryDetailService.loadDraftHistory(this.draft.entry.id).subscribe({
      next: (drafts) => {
        this.draftHistory = drafts;
        this.latestDraft = drafts.length > 0 ? drafts[0] : null;
      },
      error: (error) => {
        console.error('Error loading draft history:', error);
      }
    });
  }
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
    if (!this.draft) return;
    
    // Use latest draft from history, not the selected draft
    this.editContent = this.entryDetailService.initializeEditContentFromLatest(
      this.draftHistory,
      this.draft.content  // fallback
    );
    
    this.isEditMode = true;
    this.editRequested.emit();
  }

  onSaveEdit(): void {
    if (!this.draft?.entry?.id || !this.permissionService.currentUser) {
      this.notificationService.error('You must be logged in to save definitions.');
      return;
    }

    this.entryDetailService.createNewDraft(
      this.draft.entry.id,
      this.editContent
    ).subscribe({
      next: (newDraft) => {
        console.log('Successfully created draft:', newDraft);
        
        // Refresh draft history to get latest
        this.loadDraftHistory();  // This will update latestDraft
        
        this.isEditMode = false;
        this.editContent = '';
        this.editSaved.emit();
        this.notificationService.success(`Definition for "${this.draft?.entry?.term?.text}" saved successfully! It will be visible once approved.`);
      },
      error: (error) => {
        console.error('Failed to create draft:', error);
        this.handleSaveError(error);
      }
    });
  }

  onCancelEdit(): void {
    this.isEditMode = false;
    this.editContent = '';
    this.editCancelled.emit();
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

  // Version history methods
  toggleVersionHistory(): void {
    this.showVersionHistory = !this.showVersionHistory;
  }

  onVersionHistoryClosed(): void {
    this.showVersionHistory = false;
  }

  onDraftSelected(draft: EntryDraft): void {
    this.selectedHistoricalDraft = draft;
    console.log('Selected draft:', draft);
  }

  isEditing(): boolean {
    return this.isEditMode;
  }

  /**
   * Get the approvers to display - use latest draft approvers if available, otherwise fall back to selected draft
   */
  getApprovers(): User[] {
    if (this.latestDraft?.approvers) {
      return this.latestDraft.approvers;
    }
    return this.draft?.approvers || [];
  }

  /**
   * Get the content to display in the Proposed Definition section
   * Uses latest draft content if available, otherwise falls back to the ReviewDraft content
   */
  getProposedDefinitionContent(): string {
    if (this.latestDraft) {
      return this.latestDraft.content;
    }
    return this.draft?.content || '';
  }

  // Error handling
  private handleSaveError(error: any): void {
    let errorMessage = 'Failed to save definition. Please try again.';

    if (error.status === 400) {
      if (error.error?.detail) {
        errorMessage = error.error.detail;
      } else if (error.error?.content) {
        errorMessage = error.error.content[0];
      } else {
        errorMessage = 'Invalid data provided. Please check your input and try again.';
      }
    } else if (error.status === 403) {
      errorMessage = 'You do not have permission to save definitions.';
    } else if (error.status === 500) {
      errorMessage = 'Server error occurred. Please contact support.';
    }

    this.notificationService.error(errorMessage);
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
        return 'px-4 py-2 bg-action-success text-white rounded hover:bg-action-success-hover disabled:bg-action-secondary text-sm font-medium';
      case 'own_draft':
        return 'px-4 py-2 bg-action-primary text-white rounded hover:bg-action-primary-hover disabled:bg-action-secondary text-sm font-medium';
      default:
        return 'px-4 py-2 bg-action-secondary text-white rounded hover:bg-action-secondary-hover disabled:bg-action-secondary text-sm font-medium';
    }
  }
}
