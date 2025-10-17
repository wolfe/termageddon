import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { Subject, takeUntil, map } from 'rxjs';
import { PermissionService } from '../../services/permission.service';
import { EntryDetailService } from '../../services/entry-detail.service';
import { PanelCommonService, PanelState } from '../../services/panel-common.service';
import { GlossaryService } from '../../services/glossary.service';
import { UrlHelperService } from '../../services/url-helper.service';
import { ReviewerSelectorDialogComponent } from '../reviewer-selector-dialog/reviewer-selector-dialog.component';
import { MasterDetailLayoutComponent } from '../shared/master-detail-layout/master-detail-layout.component';
import { SearchFilterBarComponent, Perspective, SortOption } from '../shared/search-filter-bar/search-filter-bar.component';
import { DraftListItemComponent } from '../shared/draft-list-item/draft-list-item.component';
import { DraftDetailPanelComponent } from '../shared/draft-detail-panel/draft-detail-panel.component';
import { NewEntryDetailPanelComponent } from '../shared/new-entry-detail-panel/new-entry-detail-panel.component';
import { StatusSummaryComponent, StatusSummaryItem } from '../shared/status-summary/status-summary.component';
import { CreateEntryDialogComponent } from '../create-entry-dialog/create-entry-dialog.component';
import { ReviewDraft, PaginatedResponse, User, Comment } from '../../models';
import { getDraftStatus, getDraftStatusClass, canPublish } from '../../utils/draft-status.util';
import { getInitials } from '../../utils/user.util';

@Component({
  selector: 'app-my-drafts',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ReviewerSelectorDialogComponent,
    MasterDetailLayoutComponent,
    SearchFilterBarComponent,
    DraftListItemComponent,
    DraftDetailPanelComponent,
    NewEntryDetailPanelComponent,
    StatusSummaryComponent,
    CreateEntryDialogComponent
  ],
  templateUrl: './my-drafts.component.html',
  styleUrls: ['./my-drafts.component.scss'],
})
export class MyDraftsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Use centralized panel state
  state: PanelState;
  
  // My Drafts-specific state
  isEditMode: boolean = false; // Track edit mode for auto-editing
  showCreateDialog: boolean = false;

  // Unified filter state
  perspectives: Perspective[] = [];
  selectedPerspectiveId: number | null = null;
  selectedSortBy: string = '-timestamp'; // Default to newest edits first
  pendingPerspectiveId: number | null = null; // Store perspective ID from URL if perspectives not loaded yet
  
  // Sort options
  sortOptions: SortOption[] = [
    { value: '-published_at', label: 'Newest Published' },
    { value: '-timestamp', label: 'Newest Edits' },
    { value: 'entry__term__text_normalized', label: 'Term A-Z' },
    { value: '-entry__term__text_normalized', label: 'Term Z-A' }
  ];

  constructor(
    private permissionService: PermissionService,
    private entryDetailService: EntryDetailService,
    private panelCommonService: PanelCommonService,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private glossaryService: GlossaryService,
    private urlHelper: UrlHelperService
  ) {
    this.state = this.panelCommonService.initializePanelState();
  }

  ngOnInit(): void {
    this.state.currentUser = this.permissionService.currentUser;
    this.loadPerspectives();
    this.panelCommonService.loadUsers(this.state);
    
    // Subscribe to route parameters first
    this.route.queryParams.subscribe(params => {
      const draftId = params['draftId'];
      const entryId = params['entryId'];
      const editMode = params['edit'] === 'true';
      
      // Handle filter parameters from URL
      this.handleUrlFilterParams(params);
      
      // Always load the draft list first (for the left panel)
      this.loadMyDrafts();
      
      // Then handle specific draft/entry selection
      if (draftId) {
        this.loadDraftById(+draftId, editMode);
      } else if (entryId) {
        // Handle new entry case - no draft exists yet
        this.handleNewEntry(+entryId);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPerspectives(): void {
    this.glossaryService.getPerspectives()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (perspectives) => {
          this.perspectives = perspectives.results.map((p: any) => ({ id: p.id, name: p.name }));
          
          // Apply pending perspective ID from URL if available
          if (this.pendingPerspectiveId) {
            this.selectedPerspectiveId = this.pendingPerspectiveId;
            this.pendingPerspectiveId = null;
          }
        },
        error: (error) => {
          console.error('Error loading perspectives:', error);
        }
      });
  }

  loadMyDrafts(): void {
    this.panelCommonService.loadDrafts(
      { 
        eligibility: 'own',
        perspectiveId: this.selectedPerspectiveId || undefined,
        sortBy: this.selectedSortBy
      },
      this.state,
      this.route
    );
  }

  private hasRelevantUrlParams(): boolean {
    return this.panelCommonService.hasRelevantUrlParams(this.route);
  }

  private handleUrlFilterParams(params: any): void {
    // Handle perspective filter parameter
    if (params['perspective']) {
      const perspectiveId = +params['perspective'];
      if (this.perspectives.length > 0) {
        // Perspectives already loaded, set filter
        this.selectedPerspectiveId = perspectiveId;
      } else {
        // Perspectives not loaded yet, store for later
        this.pendingPerspectiveId = perspectiveId;
      }
    }
  }


  onSearch(): void {
    this.panelCommonService.onSearch(this.state.searchTerm, this.state, { 
      eligibility: 'own',
      perspectiveId: this.selectedPerspectiveId || undefined,
      sortBy: this.selectedSortBy
    });
  }

  selectDraft(draft: ReviewDraft): void {
    this.panelCommonService.selectDraft(draft, this.state);
    this.updateUrl(draft);
  }

  private loadDraftById(draftId: number, editMode: boolean = false): void {
    this.isEditMode = editMode;
    this.glossaryService.getDraftById(draftId).subscribe({
      next: (draft: ReviewDraft) => {
        this.selectDraft(draft);
        // If edit mode is requested, trigger edit after a short delay to ensure UI is ready
        if (editMode) {
          setTimeout(() => {
            this.triggerEditMode();
          }, 100);
        }
      },
      error: (error) => {
        console.error('Failed to load draft:', error);
        // Navigate back to my-drafts without specific draft
        this.router.navigate(['/my-drafts']);
      }
    });
  }

  private triggerEditMode(): void {
    // This will be handled by the draft-detail-panel component
    // We just need to set a flag that the panel can check
    this.isEditMode = true;
  }

  private updateUrl(draft: ReviewDraft): void {
    const url = this.urlHelper.buildDraftUrl(draft.id, draft, true);
    this.location.replaceState(url);
  }

  requestReviewers(): void {
    if (!this.state.selectedDraft) return;
    this.panelCommonService.showReviewerSelector(this.state.selectedDraft, this.state);
  }

  onReviewerSelectionCancelled(): void {
    this.panelCommonService.hideReviewerSelector(this.state);
  }

  onReviewerSelectionConfirmed(reviewerIds: number[]): void {
    if (!this.state.selectedDraft) return;
    this.panelCommonService.requestReview(this.state.selectedDraft.id, reviewerIds, this.state);
  }

  onCommentAdded(comment: Comment): void {
    this.panelCommonService.onCommentAdded(comment, this.state);
  }

  onCommentResolved(comment: Comment): void {
    this.panelCommonService.onCommentResolved(comment, this.state);
  }

  onCommentUnresolved(comment: Comment): void {
    this.panelCommonService.onCommentUnresolved(comment, this.state);
  }

  onApprove(): void {
    // My Drafts doesn't support approval - this is just a placeholder
    console.log('Approval not supported in My Drafts');
  }

  publishDraft(draft: ReviewDraft): void {
    this.panelCommonService.publishDraft(draft, this.state, () => {
      // Additional cleanup specific to MyDrafts if needed
    });
  }

  onEditRequested(): void {
    // Edit functionality is now handled by the draft-detail-panel component
    // This method is called when the edit button is clicked in the panel
  }

  onEditSaved(): void {
    this.panelCommonService.refreshAfterEdit(this.state, () => {
      this.loadMyDrafts();
    });
  }

  onEditCancelled(): void {
    // Edit cancellation is handled by the draft-detail-panel component
  }

  /**
   * Handle new entry case - when entryId is provided but no draft exists yet
   */
  private handleNewEntry(entryId: number): void {
    this.state.newEntryId = entryId;
    this.state.isNewEntryMode = true;
    
    // Load the entry details to show in the detail panel
    this.glossaryService.getEntry(entryId).subscribe({
      next: (entry) => {
        this.state.newEntry = entry;
      },
      error: (error) => {
        console.error('Failed to load entry:', error);
        this.state.error = 'Failed to load entry details';
      }
    });
  }

  /**
   * Handle creating the first draft for a new entry
   */
  onCreateFirstDraft(content: string): void {
    if (!this.state.newEntryId || !this.state.currentUser) {
      return;
    }

    this.entryDetailService.createNewDraft(
      this.state.newEntryId,
      content,
      this.state.currentUser.id
    ).subscribe({
      next: (newDraft) => {
        console.log('Successfully created first draft:', newDraft);
        
        // Refresh drafts list to include the new draft
        this.loadMyDrafts();
        
        // Clear new entry mode
        this.state.isNewEntryMode = false;
        this.state.newEntryId = null;
        this.state.newEntry = null;
        
        // Update URL to remove entryId parameter
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { entryId: null },
          queryParamsHandling: 'merge'
        });
      },
      error: (error) => {
        console.error('Failed to create first draft:', error);
        this.state.error = 'Failed to create draft: ' + (error.error?.detail || error.message);
      }
    });
  }

  getStatusSummaryItems(): StatusSummaryItem[] {
    const publishableCount = this.state.filteredDrafts.filter(d => 
      d.approvers && d.approvers.length > 0
    ).length;
    
    return [
      { count: publishableCount, label: 'ready to publish', color: '#10b981' },
      { count: this.state.filteredDrafts.length, label: 'total drafts', color: '#9ca3af' }
    ];
  }

  // Filter handlers
  onPerspectiveChanged(perspectiveId: number | null): void {
    this.selectedPerspectiveId = perspectiveId;
    this.loadMyDrafts();
  }

  onSortChanged(sortBy: string): void {
    this.selectedSortBy = sortBy;
    this.loadMyDrafts();
  }

  // Create Entry functionality
  openCreateDialog(): void {
    this.showCreateDialog = true;
  }

  onDialogClosed(): void {
    this.showCreateDialog = false;
  }

  onTermCreated(entry: any): void {
    this.showCreateDialog = false;
    // Refresh the drafts list to show the new entry
    this.loadMyDrafts();
  }

  navigateToGlossary(): void {
    this.router.navigate(['/glossary']);
  }
}
