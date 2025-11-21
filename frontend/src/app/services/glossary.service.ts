import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  EntryLookupResponse,
  CreateEntryRequest,
  ReviewDraft,
} from '../models';
import { BaseService } from './base.service';

@Injectable({
  providedIn: 'root',
})
export class GlossaryService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

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
  getTerms(search?: string, pageSize: number = 50): Observable<PaginatedResponse<Term>> {
    const params: any = { page_size: pageSize };
    if (search && search.trim()) {
      params.search = search.trim();
    }
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

  createEntry(entry: {
    term: number;
    perspective: number;
    is_official?: boolean;
  }): Observable<Entry> {
    return this.post<Entry>('/entries/', entry);
  }

  markOfficial(entryId: number): Observable<Entry> {
    return this.postAction<Entry>(`/entries/${entryId}/mark_official/`);
  }

  // EntryDraft endpoints
  getEntryDrafts(entryId?: number): Observable<PaginatedResponse<EntryDraft>> {
    const filters = entryId ? { entry: entryId } : undefined;
    return this.getPaginated<EntryDraft>('/entry-drafts/', filters);
  }

  getEntryDraft(id: number): Observable<EntryDraft> {
    return this.get<EntryDraft>(`/entry-drafts/${id}/`);
  }

  createEntryDraft(draft: CreateEntryDraftRequest): Observable<EntryDraft> {
    return this.post<EntryDraft>('/entry-drafts/', draft);
  }

  approveDraft(draftId: number): Observable<EntryDraft> {
    return this.postAction<EntryDraft>(`/entry-drafts/${draftId}/approve/`);
  }

  deleteDraft(draftId: number): Observable<void> {
    return this.delete<void>(`/entry-drafts/${draftId}/`);
  }

  // Search entries
  searchEntries(searchTerm: string, filters?: any): Observable<PaginatedResponse<Entry>> {
    const searchFilters = { search: searchTerm, ...filters };
    return this.getPaginated<Entry>('/entries/', searchFilters);
  }

  // User endpoints
  getUsers(page?: number): Observable<PaginatedResponse<User>> {
    const params: any = {};
    if (page) {
      params.page = page;
    }
    return this.getPaginated<User>('/users/', params);
  }

  // EntryDraft update methods
  updateEntryDraft(draftId: number, data: Partial<EntryDraft>): Observable<EntryDraft> {
    return this.patch<EntryDraft>(`/entry-drafts/${draftId}/`, data);
  }

  getUnpublishedDraftForEntry(entryId: number, authorId: number): Observable<EntryDraft | null> {
    const filters = {
      entry: entryId,
      author: authorId,
      is_published: false,
    };
    return this.getPaginated<EntryDraft>('/entry-drafts/', filters).pipe(
      map(response => (response.results.length > 0 ? response.results[0] : null))
    );
  }

  // Comment endpoints
  getComments(contentType: number, objectId: number): Observable<PaginatedResponse<Comment>> {
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
   * Get entries grouped by term for simplified glossary display (paginated)
   */
  getEntriesGroupedByTerm(filters?: any, page?: number): Observable<PaginatedResponse<GroupedEntry>> {
    const params = { ...filters };
    if (page) {
      params.page = page;
    }
    return this.get<PaginatedResponse<GroupedEntry>>('/entries/grouped-by-term/', params).pipe(
      map(response => {
        const rawResults = Array.isArray(response.results)
          ? response.results
          : Array.isArray((response as any)?.results?.results)
            ? (response as any).results.results
            : [];

        const normalizedResults = rawResults.map((group: GroupedEntry) => ({
          term: group.term,
          entries: Array.isArray(group.entries) ? group.entries : [],
        }));

        return {
          ...response,
          results: normalizedResults,
          count: response.count ?? normalizedResults.length,
        };
      })
    );
  }

  /**
   * Create a term and entry atomically in a single request
   */
  createTermAndEntry(request: CreateTermAndEntryRequest): Observable<Entry> {
    return this.post<Entry>('/entries/create-with-term/', request);
  }

  /**
   * Get system configuration values
   */
  getSystemConfig(): Observable<SystemConfig> {
    return this.get<SystemConfig>('/system-config/');
  }

  /**
   * Get draft history for an entry (paginated)
   */
  getDraftHistory(entryId: number, page?: number): Observable<PaginatedResponse<EntryDraft>> {
    const params: any = { entry: entryId };
    if (page) {
      params.page = page;
    }
    return this.getPaginated<EntryDraft>(`/entry-drafts/history/`, params);
  }

  /**
   * Get comments with draft position indicators for an entry (paginated)
   */
  getCommentsWithDraftPositions(entryId: number, page?: number): Observable<PaginatedResponse<Comment>> {
    const params: any = { entry: entryId };
    if (page) {
      params.page = page;
    }
    return this.getPaginated<Comment>(`/comments/with_draft_positions/`, params);
  }

  // New methods for entry enhancement

  /**
   * Look up or create an entry for term+perspective
   */
  lookupOrCreateEntry(request: CreateEntryRequest): Observable<EntryLookupResponse> {
    return this.post<EntryLookupResponse>('/entries/lookup-or-create-entry/', request);
  }

  /**
   * Get entry by ID with full draft information
   */
  getEntryById(entryId: number): Observable<Entry> {
    return this.get<Entry>(`/entries/${entryId}/`);
  }

  /**
   * Get draft by ID with full entry information
   */
  getDraftById(draftId: number): Observable<ReviewDraft> {
    return this.get<ReviewDraft>(`/entry-drafts/${draftId}/?expand=entry`);
  }

  /**
   * Get paginated terms from a URL (for load more functionality)
   */
  getTermsFromUrl(url: string): Observable<PaginatedResponse<Term>> {
    return this.http.get<PaginatedResponse<Term>>(url);
  }

  /**
   * Get all terms for autocomplete (deprecated - use getTerms instead)
   */
  getAllTerms(): Observable<Term[]> {
    // Request a large page size to get all terms at once
    return this.getPaginated<Term>('/terms/', { page_size: 1000 }).pipe(
      map(response => response.results)
    );
  }
}
