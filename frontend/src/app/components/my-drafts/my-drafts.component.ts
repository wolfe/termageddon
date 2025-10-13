import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, map } from 'rxjs';
import { PermissionService } from '../../services/permission.service';
import { EntryDetailService } from '../../services/entry-detail.service';
import { PanelCommonService, PanelState } from '../../services/panel-common.service';
import { ReviewerSelectorDialogComponent } from '../reviewer-selector-dialog/reviewer-selector-dialog.component';
import { MasterDetailLayoutComponent } from '../shared/master-detail-layout/master-detail-layout.component';
import { SearchFilterBarComponent } from '../shared/search-filter-bar/search-filter-bar.component';
import { DraftListItemComponent } from '../shared/draft-list-item/draft-list-item.component';
import { DraftDetailPanelComponent } from '../shared/draft-detail-panel/draft-detail-panel.component';
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
    DraftDetailPanelComponent
  ],
  templateUrl: './my-drafts.component.html',
  styleUrls: ['./my-drafts.component.scss'],
})
export class MyDraftsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Use centralized panel state
  state: PanelState;

  constructor(
    private permissionService: PermissionService,
    private entryDetailService: EntryDetailService,
    private panelCommonService: PanelCommonService
  ) {
    this.state = this.panelCommonService.initializePanelState();
  }

  ngOnInit(): void {
    this.state.currentUser = this.permissionService.currentUser;
    this.loadMyDrafts();
    this.panelCommonService.loadUsers(this.state);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMyDrafts(): void {
    this.panelCommonService.loadDrafts(
      { eligibility: 'own' },
      this.state,
      (drafts) => this.panelCommonService.getLatestDraftsPerEntry(drafts)
    );
    
    // Auto-select first draft if available
    if (this.state.drafts.length > 0 && !this.state.selectedDraft) {
      this.state.selectedDraft = this.state.drafts[0];
    }
  }


  onSearch(): void {
    this.panelCommonService.onSearch(this.state.searchTerm, this.state, { 
      eligibility: 'own' 
    });
  }

  selectDraft(draft: ReviewDraft): void {
    this.panelCommonService.selectDraft(draft, this.state);
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
}
