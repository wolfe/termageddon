import { User } from '../models';

export function getInitials(user: User): string {
  return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
}

export function formatUserName(user: User): string {
  const firstName = user.first_name || '';
  const lastName = user.last_name || '';
  return `${firstName} ${lastName}`.trim() || user.username || 'Unknown User';
}

export function getUserDisplayName(user: User | undefined): string {
  if (!user) {
    return 'Unknown User';
  }
  
  const firstName = user.first_name || '';
  const lastName = user.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim();
  
  if (fullName) {
    return fullName;
  }
  
  return user.username || 'Unknown User';
}

export function getUserAvatar(user: User): string {
  // Return initials as avatar for now
  // Could be extended to support actual avatar images
  return getInitials(user);
}

export function getInitialsFromName(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}
