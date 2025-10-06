import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  EntryVersion,
  PaginatedResponse,
  ReviewVersion,
  User,
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class ReviewService {
  private readonly API_URL = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  /**
   * Get all entry versions (approved and unapproved)
   */
  getEntryVersions(): Observable<PaginatedResponse<EntryVersion>> {
    return this.http.get<PaginatedResponse<EntryVersion>>(
      `${this.API_URL}/entry-versions/`,
    );
  }

  /**
   * Get entry versions with expanded entry details for review
   */
  getReviewVersions(
    params: string = '',
  ): Observable<PaginatedResponse<ReviewVersion>> {
    const baseUrl = `${this.API_URL}/entry-versions/`;
    const url = params
      ? `${baseUrl}${params}`
      : `${baseUrl}?expand=entry,entry.term,entry.domain`;
    return this.http.get<PaginatedResponse<ReviewVersion>>(url);
  }

  /**
   * Get pending versions (unapproved) only
   */
  getPendingVersions(): Observable<PaginatedResponse<ReviewVersion>> {
    return this.http.get<PaginatedResponse<ReviewVersion>>(
      `${this.API_URL}/entry-versions/?is_approved=false&expand=entry,entry.term,entry.domain`,
    );
  }

  /**
   * Approve an entry version
   */
  approveVersion(versionId: number): Observable<EntryVersion> {
    return this.http.post<EntryVersion>(
      `${this.API_URL}/entry-versions/${versionId}/approve/`,
      {},
    );
  }

  /**
   * Request specific users to review a version
   */
  requestReview(
    versionId: number,
    reviewerIds: number[],
  ): Observable<EntryVersion> {
    return this.http.post<EntryVersion>(
      `${this.API_URL}/entry-versions/${versionId}/request_review/`,
      {
        reviewer_ids: reviewerIds,
      },
    );
  }

  /**
   * Publish an approved version
   */
  publishVersion(versionId: number): Observable<EntryVersion> {
    return this.http.post<EntryVersion>(
      `${this.API_URL}/entry-versions/${versionId}/publish/`,
      {},
    );
  }

  /**
   * Get versions by specific author
   */
  getVersionsByAuthor(
    authorId: number,
  ): Observable<PaginatedResponse<ReviewVersion>> {
    return this.http.get<PaginatedResponse<ReviewVersion>>(
      `${this.API_URL}/entry-versions/?author=${authorId}&expand=entry,entry.term,entry.domain`,
    );
  }

  /**
   * Get versions for a specific entry
   */
  getVersionsForEntry(
    entryId: number,
  ): Observable<PaginatedResponse<ReviewVersion>> {
    return this.http.get<PaginatedResponse<ReviewVersion>>(
      `${this.API_URL}/entry-versions/?entry=${entryId}&expand=entry,entry.term,entry.domain`,
    );
  }

  /**
   * Get all users for reviewer selection
   */
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.API_URL}/users/`);
  }
}
