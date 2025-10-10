import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { Comment, PaginatedResponse } from '../models';
import { GlossaryService } from '../services/glossary.service';

@Injectable({
  providedIn: 'root'
})
export class CommentManager {
  private commentsSubject = new BehaviorSubject<Comment[]>([]);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  
  public comments$ = this.commentsSubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();

  constructor(private glossaryService: GlossaryService) {}

  loadComments(entryId: number): Observable<PaginatedResponse<Comment>> {
    this.isLoadingSubject.next(true);
    
    return new Observable(observer => {
      this.glossaryService.getComments(1, entryId).subscribe({
        next: (response: PaginatedResponse<Comment>) => {
          this.commentsSubject.next(response.results);
          this.isLoadingSubject.next(false);
          observer.next(response);
          observer.complete();
        },
        error: (error) => {
          console.error('Error loading comments:', error);
          this.isLoadingSubject.next(false);
          observer.error(error);
        }
      });
    });
  }

  handleCommentAdded(comment: Comment): void {
    const currentComments = this.commentsSubject.value;
    this.commentsSubject.next([...currentComments, comment]);
  }

  handleCommentResolved(comment: Comment): void {
    const currentComments = this.commentsSubject.value;
    const index = currentComments.findIndex(c => c.id === comment.id);
    if (index !== -1) {
      const updatedComments = [...currentComments];
      updatedComments[index] = comment;
      this.commentsSubject.next(updatedComments);
    }
  }

  handleCommentUnresolved(comment: Comment): void {
    const currentComments = this.commentsSubject.value;
    const index = currentComments.findIndex(c => c.id === comment.id);
    if (index !== -1) {
      const updatedComments = [...currentComments];
      updatedComments[index] = comment;
      this.commentsSubject.next(updatedComments);
    }
  }

  getComments(): Comment[] {
    return this.commentsSubject.value;
  }

  isLoading(): boolean {
    return this.isLoadingSubject.value;
  }

  clearComments(): void {
    this.commentsSubject.next([]);
  }
}
