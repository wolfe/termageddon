import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ReviewService } from '../../services/review.service';
import { GlossaryService } from '../../services/glossary.service';
import { PermissionService } from '../../services/permission.service';
import { ReviewerSelectorDialogComponent } from '../reviewer-selector-dialog/reviewer-selector-dialog.component';
import { CommentThreadComponent } from '../comment-thread/comment-thread.component';
import { ReviewDraft, PaginatedResponse, User, Comment } from '../../models';

@Component({
  selector: 'app-my-drafts',
  standalone: true,
  imports: [CommonModule, FormsModule, ReviewerSelectorDialogComponent, CommentThreadComponent],
  templateUrl: './my-drafts.component.html',
  styleUrls: ['./my-drafts.component.scss'],
})
export class MyDraftsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  drafts: ReviewDraft[] = [];
  filteredDrafts: ReviewDraft[] = [];
  selectedDraft: ReviewDraft | null = null;
  loading = false;
  error: string | null = null;
  searchTerm = '';
  currentUser: User | null = null;
  editingDraft: ReviewDraft | null = null;
  editContent = '';
  
  // Reviewer selection
  showReviewerSelector = false;
  allUsers: User[] = [];
  selectedReviewerIds: number[] = [];
  
  // Comments
  comments: Comment[] = [];
  isLoadingComments = false;

  constructor(
    private reviewService: ReviewService,
    private glossaryService: GlossaryService,
    private permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.permissionService.currentUser;
    this.loadMyDrafts();
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMyDrafts(): void {
    this.loading = true;
    this.error = null;

    this.reviewService.getOwnDrafts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PaginatedResponse<ReviewDraft>) => {
          this.drafts = response.results;
          this.filteredDrafts = [...this.drafts];
          // Auto-select first draft if available
          if (this.drafts.length > 0 && !this.selectedDraft) {
            this.selectedDraft = this.drafts[0];
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading my drafts:', error);
          this.error = 'Failed to load your drafts';
          this.loading = false;
        }
      });
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredDrafts = [...this.drafts];
      return;
    }

    const searchLower = this.searchTerm.toLowerCase();
    this.filteredDrafts = this.drafts.filter(draft => 
      draft.entry.term.text.toLowerCase().includes(searchLower) ||
      draft.entry.perspective.name.toLowerCase().includes(searchLower) ||
      draft.content.toLowerCase().includes(searchLower)
    );

    // If current selection is not in filtered results, select first available
    if (this.selectedDraft && !this.filteredDrafts.find(d => d.id === this.selectedDraft!.id)) {
      this.selectedDraft = this.filteredDrafts.length > 0 ? this.filteredDrafts[0] : null;
    }
  }

  selectDraft(draft: ReviewDraft): void {
    this.selectedDraft = draft;
    this.cancelEdit(); // Cancel any ongoing edit when selecting a new draft
    this.loadComments(); // Load comments for the selected draft
  }

  loadUsers(): void {
    this.glossaryService.getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users: User[]) => {
          this.allUsers = users;
        },
        error: (error) => {
          console.error('Error loading users:', error);
        }
      });
  }

  loadComments(): void {
    if (!this.selectedDraft?.entry?.id) return;
    
    this.isLoadingComments = true;
    this.glossaryService.getComments(1, this.selectedDraft.entry.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PaginatedResponse<Comment>) => {
          this.comments = response.results;
          this.isLoadingComments = false;
        },
        error: (error) => {
          console.error('Error loading comments:', error);
          this.isLoadingComments = false;
        }
      });
  }

  requestReviewers(): void {
    if (!this.selectedDraft) return;
    
    // Pre-populate with current requested reviewers
    this.selectedReviewerIds = this.selectedDraft.requested_reviewers.map(r => r.id);
    this.showReviewerSelector = true;
  }

  onReviewerSelectionCancelled(): void {
    this.showReviewerSelector = false;
    this.selectedReviewerIds = [];
  }

  onReviewerSelectionConfirmed(reviewerIds: number[]): void {
    if (!this.selectedDraft) return;

    this.reviewService.requestReview(this.selectedDraft.id, reviewerIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedDraft) => {
          // Update the draft properties
          const index = this.drafts.findIndex(d => d.id === this.selectedDraft!.id);
          if (index !== -1) {
            this.drafts[index].requested_reviewers = updatedDraft.requested_reviewers || [];
            this.filteredDrafts = [...this.drafts];
            
            // Update selected draft
            if (this.selectedDraft?.id === updatedDraft.id) {
              this.selectedDraft.requested_reviewers = updatedDraft.requested_reviewers || [];
            }
          }
          this.showReviewerSelector = false;
          this.selectedReviewerIds = [];
        },
        error: (error) => {
          console.error('Error requesting reviewers:', error);
          this.error = 'Failed to request reviewers';
        }
      });
  }

  onCommentAdded(comment: Comment): void {
    this.comments.push(comment);
  }

  onCommentResolved(comment: Comment): void {
    const index = this.comments.findIndex(c => c.id === comment.id);
    if (index !== -1) {
      this.comments[index] = comment;
    }
  }

  onCommentUnresolved(comment: Comment): void {
    const index = this.comments.findIndex(c => c.id === comment.id);
    if (index !== -1) {
      this.comments[index] = comment;
    }
  }

  getDraftStatus(draft: ReviewDraft): string {
    if (draft.is_published) {
      return 'Published';
    } else if (draft.is_approved) {
      return 'Approved';
    } else if (draft.approval_count >= 2) {
      return 'Ready to Publish';
    } else {
      return `Pending (${draft.approval_count}/2)`;
    }
  }

  getDraftStatusClass(draft: ReviewDraft): string {
    if (draft.is_published) {
      return 'status-published';
    } else if (draft.is_approved) {
      return 'status-approved';
    } else if (draft.approval_count >= 2) {
      return 'status-ready';
    } else {
      return 'status-pending';
    }
  }

  getInitials(user: User): string {
    return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
  }

  canPublish(draft: ReviewDraft): boolean {
    return draft.is_approved && !draft.is_published;
  }

  publishDraft(draft: ReviewDraft): void {
    if (!this.canPublish(draft)) {
      return;
    }

    this.reviewService.publishDraft(draft.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedDraft) => {
          // Update the draft properties in the list
          const index = this.drafts.findIndex(d => d.id === draft.id);
          if (index !== -1) {
            // Update properties instead of replacing the whole object
            this.drafts[index].is_published = updatedDraft.is_published || false;
            this.drafts[index].is_approved = updatedDraft.is_approved || false;
            
            // Update filtered drafts
            this.filteredDrafts = [...this.drafts];
            
            // Update selected draft properties if it's the one being published
            if (this.selectedDraft?.id === draft.id) {
              this.selectedDraft.is_published = updatedDraft.is_published || false;
              this.selectedDraft.is_approved = updatedDraft.is_approved || false;
            }
          }
        },
        error: (error) => {
          console.error('Error publishing draft:', error);
          this.error = 'Failed to publish draft';
        }
      });
  }

  toggleEditMode(draft: ReviewDraft): void {
    if (this.editingDraft?.id === draft.id) {
      this.cancelEdit();
    } else {
      this.editingDraft = draft;
      this.editContent = draft.content.replace(/<[^>]*>/g, ''); // Strip HTML for editing
    }
  }

  cancelEdit(): void {
    this.editingDraft = null;
    this.editContent = '';
  }

  saveDraft(draft: ReviewDraft): void {
    if (!this.editingDraft || !this.editContent.trim()) {
      return;
    }

    const updateData = {
      content: `<p>${this.editContent.trim()}</p>`,
    };

    this.glossaryService.updateEntryDraft(draft.id, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedDraft) => {
          // Update the draft properties in the list
          const index = this.drafts.findIndex(d => d.id === draft.id);
          if (index !== -1) {
            // Update properties instead of replacing the whole object
            this.drafts[index].content = updatedDraft.content;
            this.drafts[index].approvers = updatedDraft.approvers || [];
            this.drafts[index].requested_reviewers = updatedDraft.requested_reviewers || [];
            this.drafts[index].approval_count = updatedDraft.approval_count || 0;
            this.drafts[index].is_approved = updatedDraft.is_approved || false;
            this.drafts[index].is_published = updatedDraft.is_published || false;
            
            // Update filtered drafts
            this.filteredDrafts = [...this.drafts];
            
            // Update selected draft properties if it's the one being edited
            if (this.selectedDraft?.id === draft.id) {
              this.selectedDraft.content = updatedDraft.content;
              this.selectedDraft.approvers = updatedDraft.approvers || [];
              this.selectedDraft.requested_reviewers = updatedDraft.requested_reviewers || [];
              this.selectedDraft.approval_count = updatedDraft.approval_count || 0;
              this.selectedDraft.is_approved = updatedDraft.is_approved || false;
              this.selectedDraft.is_published = updatedDraft.is_published || false;
            }
          }
          this.cancelEdit();
        },
        error: (error) => {
          console.error('Error updating draft:', error);
          this.error = 'Failed to update draft';
        }
      });
  }
}
