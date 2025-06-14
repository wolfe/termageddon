import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { GlossaryService } from '../../services/glossary.service';

@Component({
  selector: 'app-definition-form',
  templateUrl: './definition-form.component.html',
  styleUrls: ['./definition-form.component.scss']
})
export class DefinitionFormComponent {
  model = {
    term: '',
    domain: '',
    definition_text: ''
  };

  constructor(
    private glossaryService: GlossaryService,
    private router: Router
  ) { }

  onSubmit(): void {
    this.glossaryService.createDefinition(this.model).subscribe({
      next: () => {
        alert('Definition proposed successfully!');
        this.router.navigate(['/definitions']);
      },
      error: (err) => {
        console.error('Error proposing definition:', err);
        alert('Failed to propose definition. See console for details.');
      }
    });
  }
}
