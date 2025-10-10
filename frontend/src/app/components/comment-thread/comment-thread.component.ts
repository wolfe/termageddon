import { Component, EventEmitter, Input, Output, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Comment, User, CreateCommentRequest } from '../../models';
import { GlossaryService } from '../../services/glossary.service';
import { PermissionService } from '../../services/permission.service';
import { RelativeTimePipe } from '../../pipes/relative-time.pipe';
import { getInitials, getUserDisplayName } from '../../utils/user.util';

@Component({
  selector: 'app-comment-thread',
  standalone: true,
  imports: [CommonModule, FormsModule, RelativeTimePipe],
  templateUrl: './comment-thread.component.html',
  styleUrls: ['./comment-thread.component.scss'],
})
export class CommentThreadComponent implements OnInit, OnChanges {
  @Input() comments: Comment[] = [];
  @Input() objectId: number = 0;
  @Input() contentType: number = 0;
  @Output() commentAdded = new EventEmitter<Comment>();
  @Output() commentResolved = new EventEmitter<Comment>();
  @Output() commentUnresolved = new EventEmitter<Comment>();

  newCommentText = '';
  replyingTo: Comment | null = null;
  replyText = '';
  loading = false;
  error: string | null = null;
  collapsedComments: Set<number> = new Set(); // Track which comments are collapsed

  constructor(
    private glossaryService: GlossaryService,
    public permissionService: PermissionService,
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
    return this.comments.filter((comment) => !comment.parent);
  }

  getReplies(comment: Comment): Comment[] {
    return this.comments.filter((c) => c.parent === comment.id);
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
      content_type: this.contentType,
      object_id: this.objectId,
      parent: this.replyingTo.id,
      text: this.replyText.trim(),
      author: this.permissionService.currentUser?.id || 0,
    };

    this.glossaryService.createComment(commentData).subscribe({
      next: (newComment) => {
        this.commentAdded.emit(newComment);
        this.cancelReply();
        this.loading = false;
      },
      error: (error) => {
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
      content_type: this.contentType,
      object_id: this.objectId,
      text: this.newCommentText.trim(),
      author: this.permissionService.currentUser?.id || 0,
    };

    this.glossaryService.createComment(commentData).subscribe({
      next: (newComment) => {
        this.commentAdded.emit(newComment);
        this.newCommentText = '';
        this.loading = false;
      },
      error: (error) => {
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
      next: (resolvedComment) => {
        this.commentResolved.emit(resolvedComment);
        this.loading = false;
      },
      error: (error) => {
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
      next: (unresolvedComment) => {
        this.commentUnresolved.emit(unresolvedComment);
        this.loading = false;
      },
      error: (error) => {
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
}
