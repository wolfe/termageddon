import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { User } from '../models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class PermissionService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private authService: AuthService) {}

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  refreshUser(): Observable<User> {
    return this.authService.getCurrentUser().pipe(tap(user => this.currentUserSubject.next(user)));
  }

  setCurrentUser(user: User): void {
    this.currentUserSubject.next(user);
  }

  clearCurrentUser(): void {
    this.currentUserSubject.next(null);
  }

  isAdmin(): boolean {
    return this.currentUser?.is_staff || false;
  }

  isPerspectiveCurator(perspectiveId?: number): boolean {
    if (!this.currentUser || !this.currentUser.perspective_curator_for) {
      return false;
    }

    if (perspectiveId === undefined) {
      return this.currentUser.perspective_curator_for.length > 0;
    }

    return this.currentUser.perspective_curator_for.includes(perspectiveId);
  }

  canMarkOfficial(perspectiveId: number): boolean {
    return this.isAdmin() || this.isPerspectiveCurator(perspectiveId);
  }

  canApprove(authorId: number): boolean {
    return this.currentUser?.id !== authorId;
  }
}
