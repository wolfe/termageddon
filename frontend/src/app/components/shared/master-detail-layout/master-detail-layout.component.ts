import { Component, Input } from '@angular/core';


@Component({
    selector: 'app-master-detail-layout',
    imports: [],
    templateUrl: './master-detail-layout.component.html',
    styleUrl: './master-detail-layout.component.scss',
    standalone: true
})
export class MasterDetailLayoutComponent {
  @Input() sidebarWidth: string = 'w-[25%]';
  @Input() detailWidth: string = 'flex-1';
  @Input() sidebarTitle: string = '';
  @Input() sidebarSubtitle: string = '';
  @Input() showBorder: boolean = true;
}
