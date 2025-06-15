import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { GlossaryService, Term } from '../../services/glossary.service';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-term-list',
  standalone: true,
  imports: [CommonModule, InfiniteScrollModule, FormsModule, RouterModule],
  templateUrl: './term-list.component.html',
  styleUrls: ['./term-list.component.scss']
})
export class TermListComponent implements OnInit {
  terms: Term[] = [];
  page = 1;
  hasMore = true;
  loading = false;
  searchQuery = '';

  constructor(private glossaryService: GlossaryService) { }

  ngOnInit(): void {
    this.loadTerms();
  }

  loadTerms(fromSearch: boolean = false): void {
    if (this.loading || !this.hasMore) {
      return;
    }

    if (fromSearch) {
      this.page = 1;
      this.terms = [];
      this.hasMore = true;
    }

    this.loading = true;
    this.glossaryService.getTerms(this.page, this.searchQuery).subscribe(response => {
      this.terms.push(...response.results);
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
    this.loadTerms(true);
  }
} 