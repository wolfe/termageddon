import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { GlossaryService, Definition } from '../../services/glossary.service';

@Component({
  selector: 'app-definition-list',
  templateUrl: './definition-list.component.html',
  styleUrls: ['./definition-list.component.scss']
})
export class DefinitionListComponent implements OnInit {
  definitions$: Observable<Definition[]> | undefined;

  constructor(private glossaryService: GlossaryService) { }

  ngOnInit(): void {
    this.definitions$ = this.glossaryService.getDefinitions();
  }
}
