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
    imports: [CommonModule, FormsModule, RelativeTimePipe, UserAvatarComponent],
    templateUrl: './comment-thread.component.html',
    styleUrls: ['./comment-thread.component.scss'],
    standalone: true
})
export class CommentThreadComponent implements OnInit, OnChanges {
  @Input() comments: Comment[] = [];
  @Input() draftId: number = 0;
  @Input() readOnly: boolean = false;
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
  reactionLoadingCommentId: number | null = null; // Track which comment is loading a reaction
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

  ngOnChanges(changes: any) {
    // Re-initialize collapsed state when comments change
    this.initializeCollapsedState();

    // If readOnly becomes true, cancel any active editing or replying
    if (changes.readOnly && changes.readOnly.currentValue === true) {
      if (this.editingComment) {
        this.cancelEdit();
      }
      if (this.replyingTo) {
        this.cancelReply();
      }
    }
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
    // Use nested replies structure from backend
    return comment.replies || [];
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

  /**
   * Find and update a comment in the comments array
   * Handles both flat array structure and nested replies structure
   * Updates the comment in place to maintain shared reference with parent component
   */
  private updateCommentInArray(updatedComment: Comment): boolean {
    // First, try to find in the flat array (top-level comments)
    const index = this.comments.findIndex(c => c.id === updatedComment.id);
    if (index !== -1) {
      // Update the comment object in place
      // Since comments is an @Input(), both parent and child share the same array/object references
      // Updating in place ensures both see the changes
      const existingComment = this.comments[index];

      // Update all fields from the server response
      existingComment.reaction_count = updatedComment.reaction_count;
      existingComment.user_has_reacted = updatedComment.user_has_reacted;

      // Update other fields that might have changed
      if (updatedComment.text !== undefined) {
        existingComment.text = updatedComment.text;
      }
      if (updatedComment.is_resolved !== undefined) {
        existingComment.is_resolved = updatedComment.is_resolved;
      }
      // Update nested replies if present in the response
      if (updatedComment.replies) {
        existingComment.replies = updatedComment.replies;
      }

      return true;
    }

    // If not found in top-level, check nested replies
    for (const comment of this.comments) {
      if (comment.replies && comment.replies.length > 0) {
        const replyIndex = comment.replies.findIndex((r: Comment) => r.id === updatedComment.id);
        if (replyIndex !== -1) {
          // Update the reply in place
          const existingReply = comment.replies[replyIndex];
          existingReply.reaction_count = updatedComment.reaction_count;
          existingReply.user_has_reacted = updatedComment.user_has_reacted;
          return true;
        }
      }
    }

    return false;
  }

  reactToComment(comment: Comment, event?: Event) {
    if (!this.permissionService.currentUser) return;

    // Don't allow reacting if already reacted (one-way only)
    if (comment.user_has_reacted) {
      return;
    }

    // Prevent event propagation to avoid double-click issues
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    // Prevent multiple simultaneous requests for the same comment
    if (this.reactionLoadingCommentId === comment.id) {
      console.warn('Reaction request already in progress for comment:', comment.id);
      return;
    }

    // Store original state for potential revert
    const currentCount = comment.reaction_count || 0;

    // Optimistically update the UI immediately for better UX
    comment.user_has_reacted = true;
    comment.reaction_count = currentCount + 1;

    this.loading = true;
    this.reactionLoadingCommentId = comment.id;
    this.error = null;

    this.glossaryService.reactToComment(comment.id).subscribe({
      next: updatedComment => {
        // Update the comment in the array with server response
        const updated = this.updateCommentInArray(updatedComment);
        if (!updated) {
          console.warn('Comment not found in array after reaction update:', updatedComment.id);
          // Revert optimistic update if comment not found
          comment.user_has_reacted = false;
          comment.reaction_count = currentCount;
        }

        // Force change detection to ensure UI updates
        this.cdr.markForCheck();
        this.loading = false;
        this.reactionLoadingCommentId = null;
      },
      error: error => {
        console.error('Error adding reaction:', error);
        // Revert optimistic update on error
        comment.user_has_reacted = false;
        comment.reaction_count = currentCount;

        // Show user-friendly error message
        let errorMessage = 'Failed to add reaction. Please try again.';
        if (error?.error?.detail) {
          errorMessage = error.error.detail;
        } else if (error?.status === 400) {
          errorMessage = 'Unable to add reaction. You may have already reacted.';
        } else if (error?.status === 403) {
          errorMessage = 'You do not have permission to react to this comment.';
        } else if (error?.status === 0 || error?.status >= 500) {
          errorMessage = 'Server error. Please check your connection and try again.';
        }

        this.error = errorMessage;
        this.loading = false;
        this.reactionLoadingCommentId = null;
        this.cdr.markForCheck();

        // Clear error after 5 seconds
        setTimeout(() => {
          if (this.error === errorMessage) {
            this.error = null;
            this.cdr.markForCheck();
          }
        }, 5000);
      },
    });
  }
}
