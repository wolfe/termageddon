import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  EntryDraft,
  PaginatedResponse,
  ReviewDraft,
  User,
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class ReviewService {
  private readonly API_URL = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  /**
   * Get all entry drafts (approved and unapproved)
   */
  getEntryDrafts(params?: any): Observable<PaginatedResponse<EntryDraft>> {
    const queryParams = params ? this.buildQueryString(params) : '';
    return this.http.get<PaginatedResponse<EntryDraft>>(
      `${this.API_URL}/entry-drafts/${queryParams}`,
    );
  }

  /**
   * Get entry drafts with expanded entry details for review
   */
  getReviewDrafts(
    params: string = '',
  ): Observable<PaginatedResponse<ReviewDraft>> {
    const baseUrl = `${this.API_URL}/entry-drafts/`;
    const url = params
      ? `${baseUrl}${params}`
      : `${baseUrl}?expand=entry,entry.term,entry.perspective`;
    return this.http.get<PaginatedResponse<ReviewDraft>>(url);
  }

  /**
   * Get pending drafts (unapproved) only
   */
  getPendingDrafts(): Observable<PaginatedResponse<ReviewDraft>> {
    return this.http.get<PaginatedResponse<ReviewDraft>>(
      `${this.API_URL}/entry-drafts/?is_approved=false&expand=entry,entry.term,entry.perspective`,
    );
  }

  /**
   * Approve an entry draft
   */
  approveDraft(draftId: number): Observable<EntryDraft> {
    return this.http.post<EntryDraft>(
      `${this.API_URL}/entry-drafts/${draftId}/approve/`,
      {},
    );
  }

  /**
   * Request specific users to review a draft
   */
  requestReview(
    draftId: number,
    reviewerIds: number[],
  ): Observable<EntryDraft> {
    return this.http.post<EntryDraft>(
      `${this.API_URL}/entry-drafts/${draftId}/request_review/`,
      {
        reviewer_ids: reviewerIds,
      },
    );
  }

  /**
   * Publish an approved draft
   */
  publishDraft(draftId: number): Observable<EntryDraft> {
    return this.http.post<EntryDraft>(
      `${this.API_URL}/entry-drafts/${draftId}/publish/`,
      {},
    );
  }

  /**
   * Get drafts by specific author
   */
  getDraftsByAuthor(
    authorId: number,
  ): Observable<PaginatedResponse<ReviewDraft>> {
    return this.http.get<PaginatedResponse<ReviewDraft>>(
      `${this.API_URL}/entry-drafts/?author=${authorId}&expand=entry,entry.term,entry.perspective`,
    );
  }

  /**
   * Get drafts for a specific entry
   */
  getDraftsForEntry(
    entryId: number,
  ): Observable<PaginatedResponse<ReviewDraft>> {
    return this.http.get<PaginatedResponse<ReviewDraft>>(
      `${this.API_URL}/entry-drafts/?entry=${entryId}&expand=entry,entry.term,entry.perspective`,
    );
  }

  /**
   * Get all users for reviewer selection
   */
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.API_URL}/users/`);
  }

  /**
   * Get drafts that the current user can approve
   */
  getDraftsCanApprove(showAll: boolean = false): Observable<PaginatedResponse<ReviewDraft>> {
    const params = new URLSearchParams();
    params.set('eligibility', 'requested_or_approved');
    params.set('expand', 'entry,entry.term,entry.perspective');
    if (showAll) {
      params.set('show_all', 'true');
    }
    
    return this.http.get<PaginatedResponse<ReviewDraft>>(
      `${this.API_URL}/entry-drafts/?${params.toString()}`,
    );
  }

  /**
   * Get user's own drafts
   */
  getOwnDrafts(): Observable<PaginatedResponse<ReviewDraft>> {
    return this.http.get<PaginatedResponse<ReviewDraft>>(
      `${this.API_URL}/entry-drafts/?eligibility=own&expand=entry,entry.term,entry.perspective`,
    );
  }

  /**
   * Get drafts already approved by current user
   */
  getApprovedDrafts(): Observable<PaginatedResponse<ReviewDraft>> {
    return this.http.get<PaginatedResponse<ReviewDraft>>(
      `${this.API_URL}/entry-drafts/?eligibility=already_approved&expand=entry,entry.term,entry.perspective`,
    );
  }

  /**
   * Search drafts with full-text search
   */
  searchDrafts(searchTerm: string, showAll: boolean = false): Observable<PaginatedResponse<ReviewDraft>> {
    const params = new URLSearchParams();
    params.set('search', searchTerm);
    params.set('expand', 'entry,entry.term,entry.perspective');
    if (showAll) {
      params.set('show_all', 'true');
    }
    return this.http.get<PaginatedResponse<ReviewDraft>>(
      `${this.API_URL}/entry-drafts/?${params.toString()}`,
    );
  }

  /**
   * Helper method to build query string from params object
   */
  private buildQueryString(params: any): string {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        searchParams.set(key, params[key].toString());
      }
    });
    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }
}
