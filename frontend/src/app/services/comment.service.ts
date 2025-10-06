import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Comment, CreateCommentRequest, PaginatedResponse } from '../models';
import { BaseService } from './base.service';

@Injectable({
  providedIn: 'root',
})
export class CommentService extends BaseService {

  getComments(contentType: number, objectId: number): Observable<Comment[]> {
    const filters = {
      content_type: contentType,
      object_id: objectId,
    };

    return this.getPaginated<Comment>('/comments/', filters).pipe(
      map((response) => this.buildCommentTree(response.results)),
    );
  }

  getComment(id: number): Observable<Comment> {
    return this.get<Comment>(`/comments/${id}/`);
  }

  addComment(comment: CreateCommentRequest): Observable<Comment> {
    return this.post<Comment>('/comments/', comment);
  }

  updateComment(id: number, text: string): Observable<Comment> {
    return this.patch<Comment>(`/comments/${id}/`, { text });
  }

  resolveComment(id: number): Observable<Comment> {
    return this.postAction<Comment>(`/comments/${id}/resolve/`);
  }

  unresolveComment(id: number): Observable<Comment> {
    return this.postAction<Comment>(`/comments/${id}/unresolve/`);
  }

  /**
   * Build a nested comment tree from a flat list of comments
   */
  buildCommentTree(comments: Comment[]): Comment[] {
    const commentMap = new Map<number, Comment>();
    const topLevel: Comment[] = [];

    // First pass: create map and initialize replies arrays
    comments.forEach((comment) => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: build tree structure
    comments.forEach((comment) => {
      const commentWithReplies = commentMap.get(comment.id)!;
      if (comment.parent) {
        const parent = commentMap.get(comment.parent);
        if (parent) {
          parent.replies.push(commentWithReplies);
        }
      } else {
        topLevel.push(commentWithReplies);
      }
    });

    return topLevel;
  }
}
