import { UserDisplayWithUsernamePipe } from './user-display-with-username.pipe';
import { User } from '../models';
import { describe, it, expect } from 'vitest';

describe('UserDisplayWithUsernamePipe', () => {
  let pipe: UserDisplayWithUsernamePipe;

  beforeEach(() => {
    pipe = new UserDisplayWithUsernamePipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should format user with first name, last name, and username', () => {
    const user: User = {
      id: 1,
      username: 'john.doe',
      first_name: 'John',
      last_name: 'Doe',
      is_staff: false,
    };

    expect(pipe.transform(user)).toBe('John Doe (john.doe)');
  });

  it('should return just username when first and last name are missing', () => {
    const user: User = {
      id: 1,
      username: 'john.doe',
      first_name: '',
      last_name: '',
      is_staff: false,
    };

    expect(pipe.transform(user)).toBe('john.doe');
  });

  it('should return just username when first and last name are undefined', () => {
    const user: User = {
      id: 1,
      username: 'john.doe',
      first_name: undefined as any,
      last_name: undefined as any,
      is_staff: false,
    };

    expect(pipe.transform(user)).toBe('john.doe');
  });

  it('should handle whitespace-only names', () => {
    const user: User = {
      id: 1,
      username: 'john.doe',
      first_name: '   ',
      last_name: '   ',
      is_staff: false,
    };

    expect(pipe.transform(user)).toBe('john.doe');
  });

  it('should return "Unknown User" when user is undefined', () => {
    expect(pipe.transform(undefined)).toBe('Unknown User');
  });

  it('should return "Unknown User" when username is also missing', () => {
    const user: User = {
      id: 1,
      username: '',
      first_name: '',
      last_name: '',
      is_staff: false,
    };

    expect(pipe.transform(user)).toBe('Unknown User');
  });

  it('should handle user with only first name', () => {
    const user: User = {
      id: 1,
      username: 'john.doe',
      first_name: 'John',
      last_name: '',
      is_staff: false,
    };

    expect(pipe.transform(user)).toBe('John (john.doe)');
  });

  it('should handle user with only last name', () => {
    const user: User = {
      id: 1,
      username: 'john.doe',
      first_name: '',
      last_name: 'Doe',
      is_staff: false,
    };

    expect(pipe.transform(user)).toBe('Doe (john.doe)');
  });
});
