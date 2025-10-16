import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Entry, ReviewDraft, User } from '../models';
import { UrlHelperService } from './url-helper.service';

@Injectable({
  providedIn: 'root',
})
export class NavigationService {

  constructor(
    private router: Router,
    private urlHelper: UrlHelperService
  ) {}

  /**
   * Navigate to entry using smart routing
   */
  navigateToEntry(entryId: number, entry?: Entry, editMode: boolean = false): void {
    if (editMode) {
      const url = this.urlHelper.buildEditEntryUrl(entryId, entry);
      this.router.navigateByUrl(url);
    } else {
      const url = this.urlHelper.buildEntryUrl(entryId, entry);
      this.router.navigateByUrl(url);
    }
  }

  /**
   * Navigate to draft using smart routing
   */
  navigateToDraft(draftId: number, draft?: ReviewDraft): void {
    const url = this.urlHelper.buildDraftUrl(draftId, draft);
    this.router.navigateByUrl(url);
  }

  /**
   * Determine which panel to show entry in
   */
  determineTargetPanel(entry: Entry, currentUser: User, editMode: boolean = false): string {
    if (editMode) {
      return this.determineEditPanel(entry, currentUser);
    }
    return this.determineViewPanel(entry, currentUser);
  }

  /**
   * Determine which panel to show draft in
   */
  determineDraftPanel(draft: ReviewDraft, currentUser: User): string {
    // If draft is published, show in glossary
    if (draft.is_published) {
      return '/glossary';
    }

    // If draft is by current user, show in my drafts
    if (draft.author.id === currentUser.id) {
      return '/my-drafts';
    }

    // Otherwise, show in review
    return '/review';
  }

  /**
   * Determine edit panel based on entry state
   */
  private determineEditPanel(entry: Entry, currentUser: User): string {
    // Check if user has unpublished draft
    if (entry.active_draft && !entry.active_draft.is_published) {
      if (entry.active_draft.author.id === currentUser.id) {
        return '/my-drafts'; // User's own draft
      } else {
        return '/review'; // Someone else's draft
      }
    } else {
      return '/my-drafts'; // Create new draft
    }
  }

  /**
   * Determine view panel based on entry state
   */
  private determineViewPanel(entry: Entry, currentUser: User): string {
    // For "View Entry" actions, prioritize published content
    // Check if there's a published draft first
    if (entry.active_draft && entry.active_draft.is_published) {
      return '/glossary'; // Published entry - show in glossary
    }
    
    // If no published draft, check for unpublished drafts
    if (entry.active_draft && !entry.active_draft.is_published) {
      // Use draft-based routing instead of panel-based routing
      return `/draft/${entry.active_draft.id}`;
    }
    
    // No active draft, show in glossary
    return '/glossary';
  }

  /**
   * Navigate to panel with specific entry selected
   */
  navigateToPanelWithEntry(panel: string, entryId: number, editMode: boolean = false): void {
    const queryParams: any = { entryId };
    if (editMode) {
      queryParams.edit = 'true';
    }
    this.router.navigate([panel], { queryParams });
  }

  /**
   * Navigate to panel with specific draft selected
   */
  navigateToPanelWithDraft(panel: string, draftId: number): void {
    this.router.navigate([panel], { queryParams: { draftId } });
  }

  /**
   * Generate shareable URL for entry
   */
  generateShareableEntryUrl(entryId: number, entry?: Entry): string {
    return this.urlHelper.buildEntryUrl(entryId, entry, true);
  }

  /**
   * Generate shareable URL for draft
   */
  generateShareableDraftUrl(draftId: number, draft?: ReviewDraft): string {
    return this.urlHelper.buildDraftUrl(draftId, draft, true);
  }
}
