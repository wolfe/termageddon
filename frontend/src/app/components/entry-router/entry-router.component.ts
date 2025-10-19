import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GlossaryService } from '../../services/glossary.service';
import { AuthService } from '../../services/auth.service';
import { Entry } from '../../models';

@Component({
  selector: 'app-entry-router',
  template: '<div>Loading...</div>',
  standalone: true,
})
export class EntryRouterComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private glossaryService: GlossaryService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const entryId = +params['entryId'];
      const isEditMode = this.route.snapshot.url.some(segment => segment.path === 'edit');
      const isNewEntry = this.route.snapshot.url.some(segment => segment.path === 'new');

      if (isNewEntry) {
        this.handleNewEntryRoute();
      } else if (entryId) {
        this.loadEntryAndRoute(entryId, isEditMode);
      } else {
        this.router.navigate(['/glossary']);
      }
    });
  }

  private loadEntryAndRoute(entryId: number, isEditMode: boolean): void {
    this.glossaryService.getEntry(entryId).subscribe({
      next: entry => {
        this.authService.getCurrentUser().subscribe({
          next: currentUser => {
            // Determine target panel based on entry state and user
            const targetPanel = this.determineTargetPanel(entry, currentUser, isEditMode);

            // Navigate to appropriate panel with entry selected
            this.router.navigate([targetPanel], {
              queryParams: { entryId: entryId, edit: isEditMode ? 'true' : undefined },
            });
          },
          error: error => {
            console.error('Failed to get current user:', error);
            this.router.navigate(['/login']);
          },
        });
      },
      error: error => {
        console.error('Failed to load entry:', error);
        this.router.navigate(['/glossary']);
      },
    });
  }

  private handleNewEntryRoute(): void {
    this.route.queryParams.subscribe(queryParams => {
      const termText = queryParams['term'];
      const perspectiveId = queryParams['perspective'];

      if (!termText || !perspectiveId) {
        console.error('Missing required parameters: term and perspective');
        this.router.navigate(['/glossary']);
        return;
      }

      const perspectiveIdNum = +perspectiveId;

      // Look up term by text to get term ID
      this.glossaryService.getTerms(termText).subscribe({
        next: termsResponse => {
          let termId: number | null = null;

          // Find exact match for the term text
          const matchingTerm = termsResponse.results.find(
            term => term.text.toLowerCase() === termText.toLowerCase()
          );

          if (matchingTerm) {
            termId = matchingTerm.id;
          }

          // Check if entry already exists for term+perspective combination
          this.checkEntryExists(termId, termText, perspectiveIdNum);
        },
        error: error => {
          console.error('Failed to lookup term:', error);
          // If term lookup fails, still proceed with entry check using term text
          this.checkEntryExists(null, termText, perspectiveIdNum);
        },
      });
    });
  }

  private checkEntryExists(termId: number | null, termText: string, perspectiveId: number): void {
    const searchParams: any = { perspective: perspectiveId };

    if (termId) {
      searchParams.term = termId;
    } else {
      searchParams.term_text = termText;
    }

    this.glossaryService.getEntries(searchParams).subscribe({
      next: entriesResponse => {
        if (entriesResponse.results.length > 0) {
          // Entry already exists, show error and provide link to view it
          const existingEntry = entriesResponse.results[0];
          console.error('Entry already exists for this term and perspective');
          this.router.navigate(['/entry', existingEntry.id]);
        } else {
          // Entry doesn't exist, navigate to My Drafts for creation
          this.router.navigate(['/my-drafts'], {
            queryParams: {
              newEntryTerm: termText,
              newEntryPerspective: perspectiveId,
              edit: 'true',
            },
          });
        }
      },
      error: error => {
        console.error('Failed to check if entry exists:', error);
        // On error, proceed with creation flow
        this.router.navigate(['/my-drafts'], {
          queryParams: {
            newEntryTerm: termText,
            newEntryPerspective: perspectiveId,
            edit: 'true',
          },
        });
      },
    });
  }

  private determineTargetPanel(entry: Entry, currentUser: any, isEditMode: boolean): string {
    // If edit mode is requested, route to appropriate edit location
    if (isEditMode) {
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

    // View mode - determine based on entry state
    if (entry.active_draft && entry.active_draft.is_published) {
      return '/glossary'; // Published entry
    } else if (entry.active_draft && !entry.active_draft.is_published) {
      if (entry.active_draft.author.id === currentUser.id) {
        return '/my-drafts'; // User's own unpublished draft
      } else {
        return '/review'; // Someone else's unpublished draft
      }
    } else {
      return '/glossary'; // No active draft, show in glossary
    }
  }
}
