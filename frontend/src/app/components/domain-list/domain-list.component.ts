import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { GlossaryService, Domain } from '../../services/glossary.service';

@Component({
  selector: 'app-domain-list',
  templateUrl: './domain-list.component.html',
  styleUrls: ['./domain-list.component.scss']
})
export class DomainListComponent implements OnInit {
  domains$: Observable<Domain[]> | undefined;

  constructor(private glossaryService: GlossaryService) { }

  ngOnInit(): void {
    this.domains$ = this.glossaryService.getDomains();
  }
}
