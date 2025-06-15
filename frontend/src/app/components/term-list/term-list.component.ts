import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { GlossaryService, Term } from '../../services/glossary.service';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-term-list',
  standalone: true,
  imports: [CommonModule, InfiniteScrollModule, FormsModule, RouterModule],
  templateUrl: './term-list.component.html',
  styleUrls: ['./term-list.component.scss']
})
export class TermListComponent implements OnInit, OnDestroy {
  terms: Term[] = [];
  page = 1;
  hasMore = true;
  loading = false;
  searchQuery = '';

  private searchSubject = new Subject<string>();
  private searchSubscription!: Subscription;

  constructor(private glossaryService: GlossaryService) { }

  ngOnInit(): void {
    this.loadTerms();

    this.searchSubscription = this.searchSubject
      .pipe(
        debounceTime(500),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.loadTerms(true);
      });
  }

  ngOnDestroy(): void {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  loadTerms(fromSearch: boolean = false): void {
    if (this.loading && !fromSearch) {
      return;
    }
    if (!this.hasMore && !fromSearch) {
      return;
    }

    if (fromSearch) {
      this.page = 1;
      this.hasMore = true;
    }

    this.loading = true;
    this.glossaryService.getTerms(this.page, this.searchQuery).subscribe(response => {
      if (fromSearch) {
        this.terms = response.results;
      } else {
        this.terms.push(...response.results);
      }
      
      this.page++;
      this.hasMore = response.next !== null;
      this.loading = false;
    }, () => {
      this.loading = false;
    });
  }

  onScroll(): void {
    this.loadTerms();
  }
  
  onSearch(): void {
    this.searchSubject.next(this.searchQuery);
  }
} 