import { Pipe, PipeTransform } from '@angular/core';
import { User } from '../models';

@Pipe({
  name: 'userDisplayWithUsername',
  standalone: true,
})
export class UserDisplayWithUsernamePipe implements PipeTransform {
  transform(user: User | undefined): string {
    if (!user) {
      return 'Unknown User';
    }

    const firstName = user.first_name?.trim() || '';
    const lastName = user.last_name?.trim() || '';
    const fullName = `${firstName} ${lastName}`.trim();
    const username = user.username?.trim() || '';

    if (fullName && username) {
      return `${fullName} (${username})`;
    }

    if (username) {
      return username;
    }

    return 'Unknown User';
  }
}
