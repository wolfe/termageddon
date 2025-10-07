import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  CreateEntryVersionRequest,
  Domain,
  Entry,
  EntryVersion,
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

  // Domain endpoints
  getDomains(): Observable<PaginatedResponse<Domain>> {
    return this.getPaginated<Domain>('/domains/');
  }

  getDomain(id: number): Observable<Domain> {
    return this.get<Domain>(`/domains/${id}/`);
  }

  createDomain(domain: Partial<Domain>): Observable<Domain> {
    return this.post<Domain>('/domains/', domain);
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

  createEntry(entry: { term: number; domain: number; is_official?: boolean }): Observable<Entry> {
    return this.post<Entry>('/entries/', entry);
  }

  markOfficial(entryId: number): Observable<Entry> {
    return this.postAction<Entry>(`/entries/${entryId}/mark_official/`);
  }

  // EntryVersion endpoints
  getEntryVersions(
    entryId?: number,
  ): Observable<PaginatedResponse<EntryVersion>> {
    const filters = entryId ? { entry: entryId } : undefined;
    return this.getPaginated<EntryVersion>('/entry-versions/', filters);
  }

  getEntryVersion(id: number): Observable<EntryVersion> {
    return this.get<EntryVersion>(`/entry-versions/${id}/`);
  }

  createEntryVersion(
    version: CreateEntryVersionRequest,
  ): Observable<EntryVersion> {
    return this.post<EntryVersion>('/entry-versions/', version);
  }

  approveVersion(versionId: number): Observable<EntryVersion> {
    return this.postAction<EntryVersion>(`/entry-versions/${versionId}/approve/`);
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

  // EntryVersion update methods
  updateEntryVersion(
    versionId: number,
    data: Partial<EntryVersion>,
  ): Observable<EntryVersion> {
    return this.patch<EntryVersion>(`/entry-versions/${versionId}/`, data);
  }

  getUnpublishedVersionForEntry(
    entryId: number,
    authorId: number,
  ): Observable<EntryVersion | null> {
    const filters = {
      entry: entryId,
      author: authorId,
      is_published: false,
    };
    return this.getPaginated<EntryVersion>('/entry-versions/', filters).pipe(
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
