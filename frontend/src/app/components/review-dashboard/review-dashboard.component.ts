import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { GlossaryService, Definition, User } from '../../services/glossary.service';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-review-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './review-dashboard.component.html',
  styleUrls: ['./review-dashboard.component.scss']
})
export class ReviewDashboardComponent implements OnInit {
  proposedDefinitions: Definition[] = [];
  isLoading = true;
  currentUser: User | null = null;
  private userSubscription!: Subscription;

  constructor(
    private glossaryService: GlossaryService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
    this.loadProposedDefinitions();
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  loadProposedDefinitions(): void {
    this.isLoading = true;
    this.glossaryService.getDefinitions(1, { status: 'proposed', page_size: '100' }).subscribe(response => {
      this.proposedDefinitions = response.results;
      this.isLoading = false;
    }, error => {
      console.error('Error loading proposed definitions:', error);
      this.isLoading = false;
    });
  }

  approve(definitionId: number): void {
    this.glossaryService.approveDefinition(definitionId).subscribe({
      next: () => {
        // Refresh the entire list to get the latest status for all items
        this.loadProposedDefinitions();
      },
      error: (err) => {
        console.error('Failed to approve:', err);
        alert(err.error.detail || 'An unknown error occurred.');
      }
    });
  }

  reject(definitionId: number): void {
    this.glossaryService.rejectDefinition(definitionId).subscribe(() => {
      this.loadProposedDefinitions();
    });
  }

  canApprove(def: Definition): boolean {
    if (!this.currentUser) {
      return false; // Not logged in
    }
    if (def.created_by?.id === this.currentUser.id) {
      return false; // Is the author
    }
    if (def.approvers.some(approver => approver.id === this.currentUser!.id)) {
      return false; // Already approved
    }
    return true;
  }
}
