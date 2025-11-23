import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { ReviewDraft, Comment, EntryDraft, User, Entry } from '../../../models';
import { CommentThreadComponent } from '../../comment-thread/comment-thread.component';
import { UserAvatarComponent } from '../user-avatar/user-avatar.component';
import { PerspectivePillComponent } from '../perspective-pill/perspective-pill.component';
import { DefinitionFormComponent } from '../../definition-form/definition-form.component';
import { VersionHistorySidebarComponent } from '../version-history-sidebar/version-history-sidebar.component';
import { BaseEntryDetailComponent } from '../base-entry-detail.component';
import { EntryDetailService } from '../../../services/entry-detail.service';
import { PermissionService } from '../../../services/permission.service';
import { NotificationService } from '../../../services/notification.service';
import { NavigationService } from '../../../services/navigation.service';
import {
  getDraftStatus,
  getDraftStatusClass,
  getApprovalStatusText,
  getEligibilityText,
  getEligibilityClass,
  getApprovalReason,
  canPublish as canPublishUtil,
  canApprove as canApproveUtil,
  getRemainingApprovals,
  getApprovalAccessLevel,
} from '../../../utils/draft-status.util';
import { getInitials, getUserDisplayName } from '../../../utils/user.util';
import { diffHtml, DiffResult } from '../../../utils/diff.util';

type DraftDisplayContext = 'review' | 'my-drafts' | 'term-detail';

@Component({
  selector: 'app-draft-detail-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CommentThreadComponent,
    UserAvatarComponent,
    PerspectivePillComponent,
    DefinitionFormComponent,
    VersionHistorySidebarComponent,
  ],
  templateUrl: './draft-detail-panel.component.html',
  styleUrl: './draft-detail-panel.component.scss',
})
export class DraftDetailPanelComponent
  extends BaseEntryDetailComponent
  implements OnInit, OnChanges, AfterViewInit, OnDestroy
{
  @Input() context: DraftDisplayContext = 'review';
  @Input() draft: ReviewDraft | null = null;
  @Input() override canEdit: boolean = false;
  @Input() override isLoadingComments: boolean = false;
  @Input() override comments: Comment[] = [];
  // Additional inputs specific to draft detail panel
  @Input() canPublishFlag: boolean = false;
  @Input() canApproveFlag: boolean = false;
  @Input() showPublishButton: boolean = true;
  @Input() showRequestReviewButton: boolean = true;
  @Input() showApproveButton: boolean = true;
  @Input() requestingReview: boolean = false;
  @Input() entryId?: number;
  @Input() currentUserId?: number;
  @Input() override isEditMode: boolean = false; // Input to trigger edit mode automatically
  @Input() canDiscard: boolean = false; // Whether the delete button should be shown

  @ViewChild('contentContainer') contentContainer?: ElementRef;

  // Additional outputs specific to draft detail panel
  @Output() approve = new EventEmitter<void>();
  @Output() publish = new EventEmitter<void>();
  @Output() requestReview = new EventEmitter<void>();
  @Output() deleteDraft = new EventEmitter<void>();
  @Output() override commentAdded = new EventEmitter<Comment>();
  @Output() override commentResolved = new EventEmitter<Comment>();
  @Output() override commentUnresolved = new EventEmitter<Comment>();

  // Additional state specific to draft detail panel
  latestDraft: EntryDraft | null = null;
  showResolvedComments: boolean = false;
  diffContent: DiffResult | null = null;

  override loadComments(entryId: number, page?: number, append: boolean = false): void {
    // In version history view, show resolved comments by default
    const showResolved = this.showVersionHistorySidebar ? true : this.showResolvedComments;
    // If viewing a specific historical draft, pass its ID
    const draftId = this.selectedHistoricalDraft ? this.selectedHistoricalDraft.id : undefined;
    super.loadComments(entryId, page, append, draftId, showResolved);
  }

  toggleResolvedComments(): void {
    this.showResolvedComments = !this.showResolvedComments;
    // Reload comments with new filter
    if (this.draft?.entry?.id) {
      this.commentsLoadedForEntryId = null; // Force reload
      this.loadComments(this.draft.entry.id);
    }
  }

  getResolvedCommentsCount(): number {
    return this.comments.filter(c => c.is_resolved).length;
  }

  constructor(
    entryDetailService: EntryDetailService,
    permissionService: PermissionService,
    private notificationService: NotificationService,
    private navigationService: NavigationService
  ) {
    super(entryDetailService, permissionService);
  }

  override ngOnInit(): void {
    this.entry = this.draft;
    if (this.draft?.entry?.id) {
      this.loadEntryData();
    }
  }

  ngAfterViewInit(): void {
    this.setupEntryLinkHandlers();
    // Fallback: ensure comments are loaded if draft is available but comments weren't loaded yet
    // This handles cases where draft was set before ngOnInit or ngOnChanges didn't fire
    // Use setTimeout to ensure this runs after all change detection cycles
    setTimeout(() => {
      const entryId = this.draft?.entry?.id;
      if (entryId && this.commentsLoadedForEntryId !== entryId && !this.isLoadingComments) {
        this.loadEntryData();
      }
    }, 0);
  }

  override ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['draft']) {
      this.entry = this.draft;
      if (this.draft?.entry?.id) {
        // Load comments and draft history when draft changes
        // This handles both initial set and subsequent changes
        const draftChange = changes['draft'];
        if (draftChange.isFirstChange() || draftChange.previousValue?.entry?.id !== this.draft.entry.id) {
          this.loadEntryData();
        }
        this.selectedHistoricalDraft = null;
        // Recalculate diff when draft changes
        setTimeout(() => this.calculateDiff(), 100);
      }
    }

    if (changes['isEditMode'] && this.isEditMode && this.draft && this.canEdit) {
      setTimeout(() => {
        this.onEdit();
      }, 100);
    }

    // After processing all changes, ensure comments are loaded if draft is available
    // This is a safety net in case draft was set but ngOnChanges didn't fire properly
    const entryId = this.draft?.entry?.id;
    if (entryId && this.commentsLoadedForEntryId !== entryId && !this.isLoadingComments) {
      // Use setTimeout to ensure this runs after all change detection
      setTimeout(() => {
        if (this.draft?.entry?.id && this.commentsLoadedForEntryId !== this.draft.entry.id && !this.isLoadingComments) {
          this.loadEntryData();
        }
      }, 0);
    }
  }

  override loadDraftHistory(): void {
    if (!this.draft?.entry?.id) return;

    this.entryDetailService.loadDraftHistory(this.draft.entry.id).subscribe({
      next: response => {
        this.draftHistory = response.results;
        this.latestDraft = response.results.length > 0 ? response.results[0] : null;
        this.hasNextDraftHistoryPage = !!response.next;
        this.draftHistoryNextPage = response.next;
        // Calculate diff after loading history
        this.calculateDiff();
      },
      error: error => {
        console.error('Error loading draft history:', error);
      },
    });
  }

  /**
   * Calculate diff between current draft and previous/published version
   */
  calculateDiff(): void {
    // Use latest draft for comparison, fallback to current draft
    const latestContent = this.latestDraft?.content || this.draft?.content;
    if (!latestContent) {
      this.diffContent = null;
      return;
    }

    let compareContent = '';

    if (this.showVersionHistorySidebar && this.selectedHistoricalDraft) {
      // In Version History: compare selected historical draft with latest draft
      compareContent = this.selectedHistoricalDraft.content;
    } else {
      // Outside Version History: compare with published version
      const publishedDraft = this.getPublishedDraft();
      if (publishedDraft) {
        compareContent = publishedDraft.content;
      }
    }

    if (!compareContent) {
      this.diffContent = null;
      return;
    }

    // Compare old content (compareContent) with new content (latestContent)
    this.diffContent = diffHtml(compareContent, latestContent);
  }

  /**
   * Get content to display (with diff if available)
   */
  getDisplayContent(): string {
    if (this.diffContent && this.diffContent.hasChanges && !this.isEditMode) {
      return this.diffContent.html;
    }
    // Use latest draft content if available, otherwise fall back to current draft
    if (this.latestDraft) {
      return this.latestDraft.content;
    }
    if (this.draft) {
      return this.draft.content;
    }
    return '';
  }
  getDraftStatus = getDraftStatus;
  getDraftStatusClass = getDraftStatusClass;
  getEligibilityText = getEligibilityText;
  getEligibilityClass = getEligibilityClass;
  getApprovalReason = getApprovalReason;
  canPublishUtil = canPublishUtil;
  canApproveUtil = canApproveUtil;
  getRemainingApprovals = getRemainingApprovals;
  getApprovalAccessLevel = getApprovalAccessLevel;
  getInitials = getInitials;
  override getUserDisplayName = getUserDisplayName;

  onApprove(): void {
    this.approve.emit();
  }

  onPublish(): void {
    this.publish.emit();
  }

  onRequestReview(): void {
    this.requestReview.emit();
  }

  onDelete(): void {
    this.deleteDraft.emit();
  }

  // Override base class methods for draft-specific behavior
  onEdit(): void {
    if (!this.draft) return;

    // Use latest draft from history, not the selected draft
    this.editContent = this.entryDetailService.initializeEditContentFromLatest(
      this.draftHistory,
      this.draft.content // fallback
    );

    this.isEditMode = true;
    this.editRequested.emit();
  }

  onSaveEdit(): void {
    if (!this.draft?.entry?.id || !this.permissionService.currentUser) {
      this.notificationService.error('You must be logged in to save definitions.');
      return;
    }

    const entryId = this.draft.entry.id;
    this.entryDetailService
      .createNewDraft(
        entryId,
        this.editContent,
        this.permissionService.currentUser?.id || 0
      )
      .subscribe({
        next: newDraft => {
          // Refresh draft history to get latest
          this.loadDraftHistory(); // This will update latestDraft

          this.isEditMode = false;
          this.editContent = '';

          // Update the draft to the new one so the parent can see it
          // The parent will reload the list and should select the newest draft
          if (this.draft) {
            // Update the draft with the new draft data
            Object.assign(this.draft, {
              id: newDraft.id,
              timestamp: newDraft.timestamp,
              content: newDraft.content,
              is_approved: newDraft.is_approved,
              approval_count: newDraft.approval_count,
            });
          }

          this.editSaved.emit();
          this.notificationService.success(
            `Definition for "${this.draft?.entry?.term?.text}" saved successfully! It will be visible once approved.`
          );
        },
        error: error => {
          console.error('Failed to create draft:', error);
          this.handleSaveError(error);
        },
      });
  }

  override onCommentAdded(comment: Comment): void {
    this.commentAdded.emit(comment);
  }

  override onCommentResolved(comment: Comment): void {
    this.commentResolved.emit(comment);
  }

  override onCommentUnresolved(comment: Comment): void {
    this.commentUnresolved.emit(comment);
  }

  override onVersionHistoryClosed(): void {
    this.showVersionHistorySidebar = false;
  }

  override onDraftSelected(draft: EntryDraft): void {
    super.onDraftSelected(draft);
    // Reload comments for the selected historical draft
    if (this.draft?.entry?.id) {
      this.commentsLoadedForEntryId = null; // Force reload
      this.loadComments(this.draft.entry.id);
    }
    // Recalculate diff when a historical draft is selected
    setTimeout(() => this.calculateDiff(), 100);
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

  onCancelEdit(): void {
    this.isEditMode = false;
    this.editContent = '';
    this.editModeChanged.emit(false);
  }

  // Missing methods that template is calling
  getRequestReviewButtonText(): string {
    return 'Request Reviewers';
  }

  getMainDraftApprovers(): User[] {
    return this.draft?.approvers || [];
  }

  getMainDraftRequestedReviewers(): User[] {
    return this.draft?.requested_reviewers || [];
  }

  getPublishedDraft(): EntryDraft | null {
    if (!this.draft) return null;

    // First check if there's a published draft in history
    if (this.draftHistory) {
      const publishedInHistory = this.draftHistory.find(d => d.is_published);
      if (publishedInHistory) return publishedInHistory;
    }

    // Then check replaces_draft
    if (this.draft.replaces_draft) {
      return this.draft.replaces_draft;
    }

    return null;
  }

  getPublishedDraftAuthor(): string {
    const published = this.getPublishedDraft();
    if (!published?.author) return 'Unknown';
    return this.getUserDisplayName(published.author);
  }

  getPublishedDraftTimestamp(): string {
    const published = this.getPublishedDraft();
    if (!published?.timestamp) return '';
    return published.timestamp;
  }

  // Generate compact approval status text
  getApprovalStatusText(): string {
    const approvers = this.getMainDraftApprovers();
    const requestedReviewers = this.getMainDraftRequestedReviewers();
    const remainingApprovals = this.draft?.remaining_approvals || 0;
    const approvalCount = this.draft?.approval_count || 0;

    if (approvers.length === 0 && requestedReviewers.length === 0) {
      return '';
    }

    if (approvers.length > 0 && requestedReviewers.length > 0) {
      // Both approvals and requests exist
      return `Approvals | Requests`;
    } else if (approvers.length > 0) {
      // Only approvals exist
      if (remainingApprovals > 0) {
        return `Approvals (${approvalCount}/${approvalCount + remainingApprovals})`;
      } else {
        return `Approvals`;
      }
    } else {
      // Only requests exist
      return `Approval Requests`;
    }
  }

  // Implementation of abstract method from BaseEntryDetailComponent
  protected getDisplayDraft(): Entry | ReviewDraft | null {
    return this.draft;
  }

  /**
   * Get the current draft ID for comment creation
   * Uses selectedHistoricalDraft if viewing version history, otherwise uses the main draft
   */
  getCurrentDraftId(): number {
    if (this.selectedHistoricalDraft) {
      return this.selectedHistoricalDraft.id;
    }
    if (this.draft) {
      return this.draft.id;
    }
    if (this.latestDraft) {
      return this.latestDraft.id;
    }
    return 0;
  }

  private setupEntryLinkHandlers(): void {
    // Add click listener to handle entry links
    const handleLinkClick = (event: Event) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'A' && target.hasAttribute('data-entry-id')) {
        event.preventDefault();
        const entryId = parseInt(target.getAttribute('data-entry-id') || '0', 10);
        if (entryId) {
          this.navigationService.navigateToEntry(entryId);
        }
      }
    };

    // Use native click handler on content area
    document.addEventListener('click', handleLinkClick);

    // Clean up on destroy
    this.destroy$.subscribe(() => {
      document.removeEventListener('click', handleLinkClick);
    });
  }
}
