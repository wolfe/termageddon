import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ReviewDraft, PaginatedResponse, User, EntryDraft } from '../models';
import { ReviewService } from './review.service';
import { GlossaryService } from './glossary.service';

export interface DraftLoadOptions {
  eligibility?: 'own' | 'requested_or_approved' | 'already_approved';
  showAll?: boolean;
  searchTerm?: string;
  authorId?: number;
  entryId?: number;
}

export interface DraftActionOptions {
  refreshCallback?: () => void;
  successMessage?: string;
  errorMessage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UnifiedDraftService {

  constructor(
    private reviewService: ReviewService,
    private glossaryService: GlossaryService
  ) {}

  /**
   * Unified method to load drafts based on context and options
   */
  loadDrafts(options: DraftLoadOptions = {}): Observable<PaginatedResponse<ReviewDraft>> {
    const { eligibility, showAll = false, searchTerm, authorId, entryId } = options;

    // Handle search requests
    if (searchTerm) {
      return this.reviewService.searchDrafts(searchTerm, showAll);
    }

    // Handle specific entry drafts
    if (entryId) {
      return this.reviewService.getDraftsForEntry(entryId);
    }

    // Handle author-specific drafts
    if (authorId) {
      return this.reviewService.getDraftsByAuthor(authorId);
    }

    // Handle eligibility-based loading
    switch (eligibility) {
      case 'own':
        return this.reviewService.getOwnDrafts();
      case 'requested_or_approved':
        return this.reviewService.getDraftsCanApprove(showAll);
      case 'already_approved':
        return this.reviewService.getApprovedDrafts();
      default:
        return this.reviewService.getPendingDrafts();
    }
  }

  /**
   * Unified draft approval
   */
  approveDraft(draftId: number, options: DraftActionOptions = {}): Observable<EntryDraft> {
    return this.reviewService.approveDraft(draftId);
  }

  /**
   * Unified draft publishing
   */
  publishDraft(draftId: number, options: DraftActionOptions = {}): Observable<EntryDraft> {
    return this.reviewService.publishDraft(draftId);
  }

  /**
   * Unified review request
   */
  requestReview(draftId: number, reviewerIds: number[], options: DraftActionOptions = {}): Observable<EntryDraft> {
    return this.reviewService.requestReview(draftId, reviewerIds);
  }

  /**
   * Unified draft update
   */
  updateDraft(draftId: number, data: Partial<EntryDraft>, options: DraftActionOptions = {}): Observable<EntryDraft> {
    return this.glossaryService.updateEntryDraft(draftId, data);
  }

  /**
   * Get users for reviewer selection
   */
  getUsers(): Observable<User[]> {
    return this.glossaryService.getUsers();
  }

  /**
   * Get draft history for an entry
   */
  getDraftHistory(entryId: number): Observable<EntryDraft[]> {
    return this.glossaryService.getDraftHistory(entryId);
  }

  /**
   * Create a new draft
   */
  createDraft(draft: any): Observable<EntryDraft> {
    return this.glossaryService.createEntryDraft(draft);
  }

  /**
   * Get a specific draft
   */
  getDraft(draftId: number): Observable<EntryDraft> {
    return this.glossaryService.getEntryDraft(draftId);
  }
}
