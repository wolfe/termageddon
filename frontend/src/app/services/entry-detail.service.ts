import { Injectable } from '@angular/core';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Entry, EntryDraft, ReviewDraft, Comment, User, CreateEntryDraftRequest } from '../models';
import { GlossaryService } from './glossary.service';
import { ReviewService } from './review.service';

@Injectable({
  providedIn: 'root',
})
export class EntryDetailService {
  constructor(
    private glossaryService: GlossaryService,
    private reviewService: ReviewService
  ) {}

  /**
   * Load draft history for an entry
   */
  loadDraftHistory(entryId: number): Observable<EntryDraft[]> {
    return this.glossaryService.getDraftHistory(entryId).pipe(
      catchError(error => {
        console.error('Error loading draft history:', error);
        return of([]);
      })
    );
  }

  /**
   * Load comments with draft position indicators for an entry
   */
  loadCommentsWithPositions(entryId: number): Observable<Comment[]> {
    return this.glossaryService.getCommentsWithDraftPositions(entryId).pipe(
      catchError(error => {
        console.error('Error loading comments with positions:', error);
        // Fallback to regular comments endpoint
        return this.glossaryService.getComments(1, entryId).pipe(
          map(response => response.results),
          catchError(fallbackError => {
            console.error('Error loading comments (fallback):', fallbackError);
            return of([]);
          })
        );
      })
    );
  }

  /**
   * Get the latest draft for an entry
   */
  getLatestDraft(entryId: number): Observable<EntryDraft | null> {
    return this.loadDraftHistory(entryId).pipe(
      map(drafts => drafts.length > 0 ? drafts[0] : null)
    );
  }

  /**
   * Get the published draft for an entry
   */
  getPublishedDraft(entryId: number): Observable<EntryDraft | null> {
    return this.loadDraftHistory(entryId).pipe(
      map(drafts => drafts.find(draft => draft.is_published) || null)
    );
  }

  /**
   * Initialize edit content from entry or draft
   */
  initializeEditContent(entry: Entry | ReviewDraft): string {
    if ('entry' in entry) {
      // ReviewDraft case
      return entry.content;
    } else {
      // Entry case - get latest draft content or published content
      if (entry.active_draft?.content) {
        return entry.active_draft.content;
      }
      return '';
    }
  }

  /**
   * Create a new draft for an entry
   */
  createNewDraft(entryId: number, content: string, authorId: number): Observable<EntryDraft> {
    const draftData: CreateEntryDraftRequest = {
      entry: entryId,
      content: content.trim(),
      author: authorId,
    };

    return this.glossaryService.createEntryDraft(draftData);
  }

  /**
   * Refresh entry data after creating a draft
   */
  refreshEntryData(entryId: number): Observable<Entry> {
    return this.glossaryService.getEntry(entryId);
  }

  /**
   * Check if entry has unpublished drafts
   */
  hasUnpublishedDrafts(draftHistory: EntryDraft[]): boolean {
    return draftHistory.some(draft => !draft.is_published);
  }

  /**
   * Get published draft from draft history
   */
  getPublishedDraftFromHistory(draftHistory: EntryDraft[]): EntryDraft | null {
    return draftHistory.find(draft => draft.is_published) || null;
  }

  /**
   * Get latest draft content from draft history
   */
  getLatestDraftContent(draftHistory: EntryDraft[], entry?: Entry): string {
    if (draftHistory.length > 0) {
      return draftHistory[0].content;
    }
    return entry?.active_draft?.content || '';
  }

  /**
   * Get published content from draft history
   */
  getPublishedContent(draftHistory: EntryDraft[]): string {
    const publishedDraft = this.getPublishedDraftFromHistory(draftHistory);
    return publishedDraft?.content || '';
  }

  /**
   * Handle comment operations
   */
  onCommentAdded(comments: Comment[], newComment: Comment): Comment[] {
    return [...comments, newComment];
  }

  onCommentResolved(comments: Comment[], updatedComment: Comment): Comment[] {
    return comments.map(comment => 
      comment.id === updatedComment.id ? updatedComment : comment
    );
  }

  onCommentUnresolved(comments: Comment[], updatedComment: Comment): Comment[] {
    return comments.map(comment => 
      comment.id === updatedComment.id ? updatedComment : comment
    );
  }

  /**
   * Get draft history for ReviewDraft (from review context)
   */
  loadDraftHistoryForReviewDraft(reviewDraft: ReviewDraft): Observable<EntryDraft[]> {
    return this.loadDraftHistory(reviewDraft.entry.id);
  }

  /**
   * Initialize edit content for ReviewDraft using draft history
   */
  initializeEditContentForReviewDraft(reviewDraft: ReviewDraft, draftHistory: EntryDraft[]): string {
    // Use latest draft from history if available
    if (draftHistory.length > 0) {
      return draftHistory[0].content;
    }
    // Fallback to the ReviewDraft content
    return reviewDraft.content;
  }

  /**
   * Initialize edit content from latest draft in history (unified method)
   */
  initializeEditContentFromLatest(draftHistory: EntryDraft[], fallbackContent?: string): string {
    if (draftHistory.length > 0) {
      return draftHistory[0].content;
    }
    return fallbackContent || '';
  }

  /**
   * Unified refresh pattern after creating a draft
   */
  refreshAfterDraftCreated(entryId: number): Observable<{
    draftHistory: EntryDraft[];
    entry?: Entry;
  }> {
    return forkJoin({
      draftHistory: this.loadDraftHistory(entryId),
      entry: this.glossaryService.getEntry(entryId).pipe(
        catchError(() => of(undefined))
      )
    });
  }

  /**
   * Determine what to show in the bottom section
   */
  getBottomSectionContent(
    selectedHistoricalDraft: EntryDraft | null,
    draftHistory: EntryDraft[],
    replacesDraft?: EntryDraft
  ): { type: 'historical' | 'published' | 'none'; draft: EntryDraft | null } {
    if (selectedHistoricalDraft) {
      return { type: 'historical', draft: selectedHistoricalDraft };
    }
    
    const publishedDraft = this.getPublishedDraftFromHistory(draftHistory);
    if (publishedDraft) {
      return { type: 'published', draft: publishedDraft };
    }
    
    if (replacesDraft) {
      return { type: 'published', draft: replacesDraft };
    }
    
    return { type: 'none', draft: null };
  }
}
