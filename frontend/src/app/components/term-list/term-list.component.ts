import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { GlossaryService, Term } from '../../services/glossary.service';

@Component({
  selector: 'app-term-list',
  templateUrl: './term-list.component.html',
  styleUrls: ['./term-list.component.scss']
})
export class TermListComponent implements OnInit {
  terms$: Observable<Term[]> | undefined;

  constructor(private glossaryService: GlossaryService) { }

  ngOnInit(): void {
    this.terms$ = this.glossaryService.getTerms();
  }
}
