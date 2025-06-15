import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { User } from './glossary.service'; // Assuming User interface is in glossary.service

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  public baseUrl = 'http://127.0.0.1:8000';
  private tokenKey = 'auth_token';

  private _isLoggedIn = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this._isLoggedIn.asObservable();

  private _currentUser = new BehaviorSubject<User | null>(null);
  public currentUser$ = this._currentUser.asObservable();

  constructor(private http: HttpClient) {
    this.checkInitialAuthState();
  }

  private checkInitialAuthState(): void {
    const token = this.getToken();
    if (token) {
      this._isLoggedIn.next(true);
      // You might want to fetch user details here if they are not stored
      // For simplicity, we assume user details might be stored or fetched upon login
      const user = this.getUserFromStorage();
      if(user) {
        this._currentUser.next(user);
      }
    }
  }

  login(credentials: {username: string, password: string}): Observable<{token: string, user: User}> {
    return this.http.post<{token: string, user: User}>(`${this.baseUrl}/api-token-auth/`, credentials).pipe(
      tap(response => {
        this.setToken(response.token);
        this.setUserInStorage(response.user);
        this._isLoggedIn.next(true);
        this._currentUser.next(response.user);
      })
    );
  }

  logout(): void {
    this.removeToken();
    this.removeUserFromStorage();
    this._isLoggedIn.next(false);
    this._currentUser.next(null);
  }

  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.tokenKey);
    }
    return null;
  }

  private setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.tokenKey, token);
    }
  }

  private removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.tokenKey);
    }
  }

  private setUserInStorage(user: User): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentUser', JSON.stringify(user));
    }
  }

  private removeUserFromStorage(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('currentUser');
    }
  }

  private getUserFromStorage(): User | null {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('currentUser');
      return user ? JSON.parse(user) : null;
    }
    return null;
  }
}
