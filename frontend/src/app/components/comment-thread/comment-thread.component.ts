import { Component, EventEmitter, Input, Output, OnInit, OnChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Comment, User, CreateCommentRequest } from '../../models';
import { GlossaryService } from '../../services/glossary.service';
import { PermissionService } from '../../services/permission.service';
import { RelativeTimePipe } from '../../pipes/relative-time.pipe';
import { UserAvatarComponent } from '../shared/user-avatar/user-avatar.component';
import { getInitials, getUserDisplayName } from '../../utils/user.util';

@Component({
  selector: 'app-comment-thread',
  standalone: true,
  imports: [CommonModule, FormsModule, RelativeTimePipe, UserAvatarComponent],
  templateUrl: './comment-thread.component.html',
  styleUrls: ['./comment-thread.component.scss'],
})
export class CommentThreadComponent implements OnInit, OnChanges {
  @Input() comments: Comment[] = [];
  @Input() draftId: number = 0;
  @Output() commentAdded = new EventEmitter<Comment>();
  @Output() commentResolved = new EventEmitter<Comment>();
  @Output() commentUnresolved = new EventEmitter<Comment>();

  newCommentText = '';
  replyingTo: Comment | null = null;
  replyText = '';
  editingComment: Comment | null = null;
  editText = '';
  loading = false;
  error: string | null = null;
  collapsedComments: Set<number> = new Set(); // Track which comments are collapsed

  constructor(
    private glossaryService: GlossaryService,
    public permissionService: PermissionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Initialize all comments as collapsed by default
    this.initializeCollapsedState();
  }

  ngOnChanges() {
    // Re-initialize collapsed state when comments change
    this.initializeCollapsedState();
  }

  private initializeCollapsedState(): void {
    this.getTopLevelComments().forEach(comment => {
      if (this.getReplies(comment).length > 0 && !this.collapsedComments.has(comment.id)) {
        this.collapsedComments.add(comment.id);
      }
    });
  }

  getTopLevelComments(): Comment[] {
    return this.comments.filter(comment => !comment.parent);
  }

  getReplies(comment: Comment): Comment[] {
    return this.comments.filter(c => c.parent === comment.id);
  }

  startReply(comment: Comment) {
    this.replyingTo = comment;
    this.replyText = '';
  }

  cancelReply() {
    this.replyingTo = null;
    this.replyText = '';
  }

  submitReply() {
    if (!this.replyText.trim() || !this.replyingTo) return;

    this.loading = true;
    this.error = null;

    const commentData: CreateCommentRequest = {
      draft_id: this.draftId,
      parent: this.replyingTo.id,
      text: this.replyText.trim(),
    };

    this.glossaryService.createComment(commentData).subscribe({
      next: newComment => {
        this.commentAdded.emit(newComment);
        this.cancelReply();
        this.loading = false;
      },
      error: error => {
        console.error('Error creating reply:', error);
        this.error = 'Failed to create reply';
        this.loading = false;
      },
    });
  }

  submitNewComment() {
    if (!this.newCommentText.trim()) return;

    this.loading = true;
    this.error = null;

    const commentData: CreateCommentRequest = {
      draft_id: this.draftId,
      text: this.newCommentText.trim(),
    };

    this.glossaryService.createComment(commentData).subscribe({
      next: newComment => {
        this.commentAdded.emit(newComment);
        this.newCommentText = '';
        this.loading = false;
      },
      error: error => {
        console.error('Error creating comment:', error);
        this.error = 'Failed to create comment';
        this.loading = false;
      },
    });
  }

  resolveComment(comment: Comment) {
    this.loading = true;
    this.error = null;

    this.glossaryService.resolveComment(comment.id).subscribe({
      next: resolvedComment => {
        this.commentResolved.emit(resolvedComment);
        this.loading = false;
      },
      error: error => {
        console.error('Error resolving comment:', error);
        this.error = 'Failed to resolve comment';
        this.loading = false;
      },
    });
  }

  unresolveComment(comment: Comment) {
    this.loading = true;
    this.error = null;

    this.glossaryService.unresolveComment(comment.id).subscribe({
      next: unresolvedComment => {
        this.commentUnresolved.emit(unresolvedComment);
        this.loading = false;
      },
      error: error => {
        console.error('Error unresolving comment:', error);
        this.error = 'Failed to unresolve comment';
        this.loading = false;
      },
    });
  }

  canResolve(comment: Comment): boolean {
    if (!this.permissionService.currentUser) return false;
    return (
      !comment.parent &&
      (comment.author.id === this.permissionService.currentUser.id ||
        this.permissionService.currentUser.is_staff)
    );
  }

  canReply(comment: Comment): boolean {
    return !comment.is_resolved && this.permissionService.currentUser !== null;
  }

  canEdit(comment: Comment): boolean {
    if (!this.permissionService.currentUser) return false;
    return comment.author.id === this.permissionService.currentUser.id;
  }

  startEdit(comment: Comment) {
    this.editingComment = comment;
    this.editText = comment.text;
  }

  cancelEdit() {
    this.editingComment = null;
    this.editText = '';
  }

  submitEdit() {
    if (!this.editingComment || !this.editText.trim()) return;

    this.loading = true;
    this.error = null;

    this.glossaryService.updateComment(this.editingComment.id, this.editText.trim()).subscribe({
      next: updatedComment => {
        // Update the comment in the local array
        const index = this.comments.findIndex(c => c.id === updatedComment.id);
        if (index !== -1) {
          this.comments[index] = updatedComment;
        }
        this.cancelEdit();
        this.loading = false;
      },
      error: error => {
        console.error('Error updating comment:', error);
        this.error = 'Failed to update comment';
        this.loading = false;
      },
    });
  }

  getInitials = getInitials;
  getUserDisplayName = getUserDisplayName;

  toggleCommentCollapse(comment: Comment): void {
    if (this.collapsedComments.has(comment.id)) {
      this.collapsedComments.delete(comment.id);
    } else {
      this.collapsedComments.add(comment.id);
    }
  }

  isCommentCollapsed(comment: Comment): boolean {
    return this.collapsedComments.has(comment.id);
  }

  getReplyCount(comment: Comment): number {
    return this.getReplies(comment).length;
  }

  getDraftPositionText(comment: Comment): string {
    if (!comment.draft_position) return '';

    switch (comment.draft_position) {
      case 'current draft':
        return 'Current Draft';
      case 'published':
        return 'Published Version';
      default:
        return comment.draft_position;
    }
  }

  getDraftPositionClass(comment: Comment): string {
    if (!comment.draft_position) return '';

    switch (comment.draft_position) {
      case 'current draft':
        return 'bg-status-approved-light text-status-approved';
      case 'published':
        return 'bg-status-published-light text-status-published';
      default:
        return 'bg-ui-background-elevated text-ui-text-muted';
    }
  }

  /**
   * Format comment text with @mention highlighting
   */
  formatCommentText(comment: Comment): string {
    let text = comment.text;

    // Escape HTML first
    const div = document.createElement('div');
    div.textContent = text;
    text = div.innerHTML;

    // Highlight @mentions
    text = text.replace(/@(\w+(?:\s+\w+)*)/g, '<span class="mention-highlight">@$1</span>');

    // Add edited indicator if needed
    if (comment.edited_at) {
      text += ' <span class="edited-indicator" title="Edited">(edited)</span>';
    }

    return text;
  }

  toggleReaction(comment: Comment, event?: Event) {
    if (!this.permissionService.currentUser) return;

    // Prevent event propagation to avoid double-click issues
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    // Optimistically update the UI immediately for better UX
    const wasReacted = comment.user_has_reacted;
    const currentCount = comment.reaction_count || 0;

    // Update immediately
    comment.user_has_reacted = !wasReacted;
    comment.reaction_count = wasReacted ? Math.max(0, currentCount - 1) : currentCount + 1;

    this.loading = true;
    this.error = null;

    const action = wasReacted
      ? this.glossaryService.unreactToComment(comment.id)
      : this.glossaryService.reactToComment(comment.id);

    action.subscribe({
      next: updatedComment => {
        // Update the comment in the local array with server response
        const index = this.comments.findIndex(c => c.id === updatedComment.id);
        if (index !== -1) {
          // Create a new array to trigger change detection
          this.comments = [
            ...this.comments.slice(0, index),
            updatedComment,
            ...this.comments.slice(index + 1)
          ];
          // Force change detection to ensure UI updates
          this.cdr.markForCheck();
        }
        this.loading = false;
      },
      error: error => {
        console.error('Error toggling reaction:', error);
        // Revert optimistic update on error
        comment.user_has_reacted = wasReacted;
        comment.reaction_count = currentCount;
        this.error = 'Failed to update reaction';
        this.loading = false;
      },
    });
  }
}
