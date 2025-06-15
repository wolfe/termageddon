import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { GlossaryService, Term, Definition } from '../../services/glossary.service';
import { DefinitionFormComponent } from '../definition-form/definition-form.component';

@Component({
  selector: 'app-term-detail',
  standalone: true,
  imports: [CommonModule, DefinitionFormComponent, RouterModule],
  templateUrl: './term-detail.component.html',
  styleUrls: ['./term-detail.component.scss']
})
export class TermDetailComponent implements OnInit {
  term: Term | undefined;
  definitions: Definition[] = [];
  
  constructor(
    private route: ActivatedRoute,
    private glossaryService: GlossaryService
  ) { }

  ngOnInit(): void {
    const termId = Number(this.route.snapshot.paramMap.get('id'));
    if (termId) {
      this.loadTerm(termId);
      this.loadDefinitions(termId);
    }
  }

  loadTerm(id: number): void {
    this.glossaryService.getTerms().subscribe(response => {
      this.term = response.results.find(t => t.id === id);
    });
  }

  loadDefinitions(termId: number): void {
    this.glossaryService.getDefinitions(1, { term__id: termId.toString(), page_size: '100' }).subscribe(response => {
      this.definitions = response.results;
    });
  }
  
  onDefinitionSaved(definition: Definition): void {
    // Refresh the list of definitions after a new one is saved
    if (this.term) {
        this.loadDefinitions(this.term.id);
    }
  }
} 