import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-master-detail-layout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './master-detail-layout.component.html',
  styleUrl: './master-detail-layout.component.scss'
})
export class MasterDetailLayoutComponent {
  @Input() sidebarWidth: string = 'w-1/3';
  @Input() detailWidth: string = 'flex-1';
  @Input() sidebarTitle: string = '';
  @Input() sidebarSubtitle: string = '';
  @Input() showBorder: boolean = true;
}
