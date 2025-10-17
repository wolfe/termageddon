import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GlossaryService } from '../../services/glossary.service';
import { AuthService } from '../../services/auth.service';
import { EntryDraft } from '../../models';

@Component({
  selector: 'app-draft-router',
  template: '<div>Loading...</div>',
  standalone: true,
})
export class DraftRouterComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private glossaryService: GlossaryService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const draftId = +params['draftId'];
      
      if (draftId) {
        this.loadDraftAndRoute(draftId);
      } else {
        this.router.navigate(['/glossary']);
      }
    });
  }

  private loadDraftAndRoute(draftId: number): void {
    this.glossaryService.getEntryDraft(draftId).subscribe({
      next: (draft) => {
        this.authService.getCurrentUser().subscribe({
          next: (currentUser) => {
            // Determine target panel based on draft state and user
            const targetPanel = this.determineDraftPanel(draft, currentUser);
            
            // Navigate to appropriate panel with draft selected
            this.router.navigate([targetPanel], {
              queryParams: { draftId: draftId }
            });
          },
          error: (error) => {
            console.error('Failed to get current user:', error);
            this.router.navigate(['/login']);
          }
        });
      },
      error: (error) => {
        console.error('Failed to load draft:', error);
        this.router.navigate(['/glossary']);
      }
    });
  }

  private determineDraftPanel(draft: EntryDraft, currentUser: any): string {
    // If draft is published, show in glossary
    if (draft.is_published) {
      return '/glossary';
    }

    // If draft is by current user, show in my drafts
    if (draft.author.id === currentUser.id) {
      return '/my-drafts';
    }

    // Otherwise, show in review (if user can review)
    return '/review';
  }
}
