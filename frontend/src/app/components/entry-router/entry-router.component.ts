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
      
      if (entryId) {
        this.loadEntryAndRoute(entryId, isEditMode);
      } else {
        this.router.navigate(['/glossary']);
      }
    });
  }

  private loadEntryAndRoute(entryId: number, isEditMode: boolean): void {
    this.glossaryService.getEntry(entryId).subscribe({
      next: (entry) => {
        const currentUser = this.authService.getCurrentUser();
        if (!currentUser) {
          this.router.navigate(['/login']);
          return;
        }

        // Determine target panel based on entry state and user
        const targetPanel = this.determineTargetPanel(entry, currentUser, isEditMode);
        
        // Navigate to appropriate panel with entry selected
        this.router.navigate([targetPanel], {
          queryParams: { entryId: entryId, edit: isEditMode ? 'true' : undefined }
        });
      },
      error: (error) => {
        console.error('Failed to load entry:', error);
        this.router.navigate(['/glossary']);
      }
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
