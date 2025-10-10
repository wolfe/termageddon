import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  CreateEntryDraftRequest,
  Perspective,
  Entry,
  EntryDraft,
  PaginatedResponse,
  Term,
  User,
  Comment,
  CreateCommentRequest,
  GroupedEntry,
  SystemConfig,
  CreateTermAndEntryRequest,
} from '../models';
import { BaseService } from './base.service';

@Injectable({
  providedIn: 'root',
})
export class GlossaryService extends BaseService {

  // Perspective endpoints
  getPerspectives(): Observable<PaginatedResponse<Perspective>> {
    return this.getPaginated<Perspective>('/perspectives/');
  }

  getPerspective(id: number): Observable<Perspective> {
    return this.get<Perspective>(`/perspectives/${id}/`);
  }

  createPerspective(perspective: Partial<Perspective>): Observable<Perspective> {
    return this.post<Perspective>('/perspectives/', perspective);
  }

  // Term endpoints
  getTerms(params?: any): Observable<PaginatedResponse<Term>> {
    return this.getPaginated<Term>('/terms/', params);
  }

  getTerm(id: number): Observable<Term> {
    return this.get<Term>(`/terms/${id}/`);
  }

  createTerm(term: Partial<Term>): Observable<Term> {
    return this.post<Term>('/terms/', term);
  }

  // Entry endpoints
  getEntries(filters?: any): Observable<PaginatedResponse<Entry>> {
    return this.getPaginated<Entry>('/entries/', filters);
  }

  getEntry(id: number): Observable<Entry> {
    return this.get<Entry>(`/entries/${id}/`);
  }

  createEntry(entry: { term: number; perspective: number; is_official?: boolean }): Observable<Entry> {
    return this.post<Entry>('/entries/', entry);
  }

  markOfficial(entryId: number): Observable<Entry> {
    return this.postAction<Entry>(`/entries/${entryId}/mark_official/`);
  }

  // EntryDraft endpoints
  getEntryDrafts(
    entryId?: number,
  ): Observable<PaginatedResponse<EntryDraft>> {
    const filters = entryId ? { entry: entryId } : undefined;
    return this.getPaginated<EntryDraft>('/entry-drafts/', filters);
  }

  getEntryDraft(id: number): Observable<EntryDraft> {
    return this.get<EntryDraft>(`/entry-drafts/${id}/`);
  }

  createEntryDraft(
    draft: CreateEntryDraftRequest,
  ): Observable<EntryDraft> {
    return this.post<EntryDraft>('/entry-drafts/', draft);
  }

  approveDraft(draftId: number): Observable<EntryDraft> {
    return this.postAction<EntryDraft>(`/entry-drafts/${draftId}/approve/`);
  }

  // Search entries
  searchEntries(
    searchTerm: string,
    filters?: any,
  ): Observable<PaginatedResponse<Entry>> {
    const searchFilters = { search: searchTerm, ...filters };
    return this.getPaginated<Entry>('/entries/', searchFilters);
  }

  // User endpoints
  getUsers(): Observable<User[]> {
    return this.get<User[]>('/users/');
  }

  // EntryDraft update methods
  updateEntryDraft(
    draftId: number,
    data: Partial<EntryDraft>,
  ): Observable<EntryDraft> {
    return this.patch<EntryDraft>(`/entry-drafts/${draftId}/`, data);
  }

  getUnpublishedDraftForEntry(
    entryId: number,
    authorId: number,
  ): Observable<EntryDraft | null> {
    const filters = {
      entry: entryId,
      author: authorId,
      is_published: false,
    };
    return this.getPaginated<EntryDraft>('/entry-drafts/', filters).pipe(
      map((response) =>
        response.results.length > 0 ? response.results[0] : null,
      ),
    );
  }

  // Comment endpoints
  getComments(
    contentType: number,
    objectId: number,
  ): Observable<PaginatedResponse<Comment>> {
    const filters = {
      content_type: contentType,
      object_id: objectId,
    };
    return this.getPaginated<Comment>('/comments/', filters);
  }

  createComment(comment: CreateCommentRequest): Observable<Comment> {
    return this.post<Comment>('/comments/', comment);
  }

  resolveComment(commentId: number): Observable<Comment> {
    return this.postAction<Comment>(`/comments/${commentId}/resolve/`);
  }

  unresolveComment(commentId: number): Observable<Comment> {
    return this.postAction<Comment>(`/comments/${commentId}/unresolve/`);
  }

  endorseEntry(entryId: number): Observable<Entry> {
    return this.postAction<Entry>(`/entries/${entryId}/endorse/`);
  }

  // New backend enhancement methods

  /**
   * Get entries grouped by term for simplified glossary display
   */
  getEntriesGroupedByTerm(filters?: any): Observable<GroupedEntry[]> {
    return this.get<GroupedEntry[]>('/entries/grouped_by_term/', filters);
  }

  /**
   * Create a term and entry atomically in a single request
   */
  createTermAndEntry(request: CreateTermAndEntryRequest): Observable<Entry> {
    return this.post<Entry>('/entries/create_with_term/', request);
  }

  /**
   * Get system configuration values
   */
  getSystemConfig(): Observable<SystemConfig> {
    return this.get<SystemConfig>('/system-config/');
  }
}
