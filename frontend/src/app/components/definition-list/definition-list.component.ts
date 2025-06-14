import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { GlossaryService, Definition, PaginatedResponse } from '../../services/glossary.service';

@Component({
  selector: 'app-definition-list',
  templateUrl: './definition-list.component.html',
  styleUrls: ['./definition-list.component.scss']
})
export class DefinitionListComponent implements OnInit, AfterViewInit {
  @ViewChild('searchInput') searchInput!: ElementRef;
  @ViewChild('statusSelect') statusSelect!: ElementRef;

  response$!: Observable<PaginatedResponse<Definition>>;
  private pageUrl = new Subject<string>();
  private filters = new Subject<void>();

  constructor(private glossaryService: GlossaryService) { }

  ngOnInit(): void {
    const initialParams = this.getHttpParams();
    this.response$ = this.filters.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(() => this.glossaryService.getDefinitions(this.getHttpParams()))
    );

    // Initial load
    this.filters.next();
  }
  
  ngAfterViewInit(): void {
    // Trigger initial filter
    this.filters.next();
  }

  getHttpParams(): HttpParams {
    let params = new HttpParams();
    if (this.searchInput?.nativeElement.value) {
      params = params.set('search', this.searchInput.nativeElement.value);
    }
    if (this.statusSelect?.nativeElement.value) {
      params = params.set('status', this.statusSelect.nativeElement.value);
    }
    return params;
  }
  
  onFilterChange(): void {
    this.filters.next();
  }

  loadPage(url: string | null): void {
    if (url) {
      // The glossary service expects params, not a full URL.
      // We extract the query string from the URL.
      const urlObject = new URL(url);
      const params = new HttpParams({ fromString: urlObject.search });
      this.response$ = this.glossaryService.getDefinitions(params);
    }
  }

  approve(id: number): void {
    this.glossaryService.approveDefinition(id).subscribe(() => {
      // Refresh the current view
      this.onFilterChange();
    });
  }
}
