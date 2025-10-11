import { User } from '../models';

export function getInitials(user: User): string {
  if (!user) return '';
  
  const firstName = user.first_name?.trim() || '';
  const lastName = user.last_name?.trim() || '';
  
  // If we have both names, use first letter of each
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  
  // If we only have one name, use first two letters
  if (firstName) {
    return firstName.substring(0, 2).toUpperCase();
  }
  
  // If we only have username, use first two characters
  if (user.username) {
    return user.username.substring(0, 2).toUpperCase();
  }
  
  return '';
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
  
  const firstName = user.first_name?.trim() || '';
  const lastName = user.last_name?.trim() || '';
  const fullName = `${firstName} ${lastName}`.trim();
  
  if (fullName) {
    return fullName;
  }
  
  // If no first/last name, try to use username
  if (user.username?.trim()) {
    return user.username.trim();
  }
  
  return 'Unknown User';
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
