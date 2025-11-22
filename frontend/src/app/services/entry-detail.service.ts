import { Injectable } from '@angular/core';
import { Observable, of, map, switchMap } from 'rxjs';
import { EntryDraft, Comment, Entry, ReviewDraft, PaginatedResponse } from '../models';
import { GlossaryService } from './glossary.service';

@Injectable({
  providedIn: 'root',
})
export class EntryDetailService {
  constructor(private glossaryService: GlossaryService) {}

  /**
   * Load draft history for an entry (paginated)
   */
  loadDraftHistory(entryId: number, page?: number): Observable<PaginatedResponse<EntryDraft>> {
    return this.glossaryService.getDraftHistory(entryId, page);
  }

  /**
   * Load comments with draft position indicators for an entry (paginated)
   */
  loadCommentsWithPositions(entryId: number, page?: number, draftId?: number, showResolved?: boolean): Observable<PaginatedResponse<Comment>> {
    return this.glossaryService.getCommentsWithDraftPositions(entryId, page, draftId, showResolved);
  }

  /**
   * Get the latest draft for an entry
   */
  getLatestDraft(entryId: number): Observable<EntryDraft | null> {
    return this.glossaryService.getEntryDrafts(entryId).pipe(
      map(response => {
        if (response.results.length === 0) return null;

        // Sort by timestamp descending and return the latest
        const sortedDrafts = response.results.sort(
          (a: EntryDraft, b: EntryDraft) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        return sortedDrafts[0];
      })
    );
  }

  /**
   * Get the published draft for an entry
   */
  getPublishedDraft(entryId: number): Observable<EntryDraft | null> {
    return this.glossaryService.getEntryDrafts(entryId).pipe(
      map(response => {
        const publishedDraft = response.results.find((draft: EntryDraft) => draft.is_published);
        return publishedDraft || null;
      })
    );
  }

  /**
   * Initialize edit content from entry or draft
   */
  initializeEditContent(entry: Entry | ReviewDraft): string {
    if ('active_draft' in entry && entry.active_draft) {
      return entry.active_draft.content;
    }
    if ('content' in entry) {
      return entry.content;
    }
    return '';
  }

  /**
   * Create a new draft for an entry
   */
  createNewDraft(entryId: number, content: string, authorId: number): Observable<EntryDraft> {
    const draftData = {
      entry: entryId,
      content: content,
    };
    return this.glossaryService.createEntryDraft(draftData);
  }

  /**
   * Handle comment added - update local comments array
   */
  onCommentAdded(comments: Comment[], comment: Comment): Comment[] {
    return [...comments, comment];
  }

  /**
   * Handle comment resolved - update local comments array
   */
  onCommentResolved(comments: Comment[], comment: Comment): Comment[] {
    return comments.map(c => (c.id === comment.id ? { ...c, is_resolved: true } : c));
  }

  /**
   * Handle comment unresolved - update local comments array
   */
  onCommentUnresolved(comments: Comment[], comment: Comment): Comment[] {
    return comments.map(c => (c.id === comment.id ? { ...c, is_resolved: false } : c));
  }

  /**
   * Get entry ID from entry or draft
   */
  getEntryId(entry: Entry | ReviewDraft): number | null {
    if ('id' in entry && 'term' in entry) {
      // This is an Entry
      return entry.id;
    }
    if ('entry' in entry && entry.entry) {
      // This is a ReviewDraft with nested entry
      return entry.entry.id;
    }
    return null;
  }

  /**
   * Check if entry has unpublished drafts
   */
  hasUnpublishedDrafts(entry: Entry | ReviewDraft): boolean {
    if ('active_draft' in entry && entry.active_draft) {
      return !entry.active_draft.is_published;
    }
    if ('is_published' in entry) {
      return !entry.is_published;
    }
    return false;
  }

  /**
   * Get published content from entry or draft
   */
  getPublishedContent(entry: Entry | ReviewDraft): string {
    if ('active_draft' in entry && entry.active_draft && entry.active_draft.is_published) {
      return entry.active_draft.content;
    }
    if ('is_published' in entry && entry.is_published) {
      return entry.content;
    }
    return '';
  }

  /**
   * Initialize edit content from latest draft in history
   */
  initializeEditContentFromLatest(draftHistory: EntryDraft[], fallbackContent: string): string {
    if (draftHistory.length > 0) {
      return draftHistory[0].content;
    }
    return fallbackContent;
  }

  /**
   * Refresh entry data after draft creation
   */
  refreshAfterDraftCreated(
    entryId: number
  ): Observable<{ draftHistory: EntryDraft[]; entry: Entry }> {
    return this.loadDraftHistory(entryId).pipe(
      map(response => response.results),
      switchMap(draftHistory =>
        this.glossaryService.getEntry(entryId).pipe(map(entry => ({ draftHistory, entry })))
      )
    );
  }
}
