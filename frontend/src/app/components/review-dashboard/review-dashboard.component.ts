import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { GlossaryService, Definition, User } from '../../services/glossary.service';
import { AuthService } from '../../services/auth.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';

@Component({
  selector: 'app-review-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, InfiniteScrollModule],
  templateUrl: './review-dashboard.component.html',
  styleUrls: ['./review-dashboard.component.scss']
})
export class ReviewDashboardComponent implements OnInit, OnDestroy {
  proposedDefinitions: Definition[] = [];
  isLoading = false;
  currentUser: User | null = null;
  
  page = 1;
  hasMore = true;
  searchQuery = '';
  
  private userSubscription!: Subscription;
  private searchSubject = new Subject<string>();
  private searchSubscription!: Subscription;


  constructor(
    private glossaryService: GlossaryService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
    this.loadProposedDefinitions();

    this.searchSubscription = this.searchSubject
      .pipe(
        debounceTime(500),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.loadProposedDefinitions(true);
      });
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  loadProposedDefinitions(fromSearch: boolean = false): void {
    if (this.isLoading && !fromSearch) return;
    if (!this.hasMore && !fromSearch) return;

    if (fromSearch) {
      this.page = 1;
      this.hasMore = true;
      this.proposedDefinitions = [];
    }

    this.isLoading = true;
    const filters = { 
      status: 'proposed', 
      search: this.searchQuery 
    };

    this.glossaryService.getDefinitions(this.page, filters).subscribe(response => {
      if (fromSearch) {
        this.proposedDefinitions = response.results;
      } else {
        this.proposedDefinitions.push(...response.results);
      }
      this.page++;
      this.hasMore = response.next !== null;
      this.isLoading = false;
    }, error => {
      console.error('Error loading proposed definitions:', error);
      this.isLoading = false;
    });
  }

  onScroll(): void {
    this.loadProposedDefinitions();
  }
  
  onSearch(): void {
    this.searchSubject.next(this.searchQuery);
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
      this.loadProposedDefinitions(true); // reload to get fresh results
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
