import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { GlossaryService, Definition } from '../../services/glossary.service';
import { AuthService } from '../../services/auth.service';

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

  constructor(
    private glossaryService: GlossaryService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.loadProposedDefinitions();
  }

  loadProposedDefinitions(): void {
    this.isLoading = true;
    // Assuming the API supports filtering by status and can return all results
    this.glossaryService.getDefinitions(1, { status: 'proposed', page_size: '100' }).subscribe(response => {
      this.proposedDefinitions = response.results;
      this.isLoading = false;
    }, error => {
      console.error('Error loading proposed definitions:', error);
      this.isLoading = false;
    });
  }

  approve(definitionId: number): void {
    this.glossaryService.approveDefinition(definitionId).subscribe(() => {
      this.removeDefinitionFromList(definitionId);
    });
  }

  reject(definitionId: number): void {
    this.glossaryService.rejectDefinition(definitionId).subscribe(() => {
      this.removeDefinitionFromList(definitionId);
    });
  }

  private removeDefinitionFromList(id: number): void {
    this.proposedDefinitions = this.proposedDefinitions.filter(def => def.id !== id);
  }
}
