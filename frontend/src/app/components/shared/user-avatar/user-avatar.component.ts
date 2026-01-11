import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../../models';
import { getInitials, getUserDisplayName } from '../../../utils/user.util';

@Component({
    selector: 'app-user-avatar',
    imports: [CommonModule],
    template: `
    <div [class]="getAvatarClasses()" [title]="getUserDisplayName(user)" *ngIf="user">
      {{ getInitials(user) || '?' }}
    </div>
  `,
    styles: []
})
export class UserAvatarComponent {
  @Input() user!: User | undefined;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() color: 'blue' | 'green' | 'purple' | 'yellow' = 'blue';
  @Input() clickable: boolean = false;

  getInitials = getInitials;
  getUserDisplayName = getUserDisplayName;

  getAvatarClasses(): string {
    const sizeClasses = {
      small: 'w-4 h-4 text-xs',
      medium: 'w-6 h-6 text-xs',
      large: 'w-8 h-8 text-xs',
    };

    const colorClasses = {
      blue: 'bg-action-primary text-white',
      green: 'bg-role-approver text-white',
      purple: 'bg-role-reviewer text-white',
      yellow: 'bg-role-admin text-black',
    };

    const cursorClass = this.clickable ? 'cursor-pointer' : 'cursor-default';

    return [
      'rounded-full flex items-center justify-center font-semibold',
      sizeClasses[this.size],
      colorClasses[this.color],
      cursorClass,
    ].join(' ');
  }
}
