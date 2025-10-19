import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { LoginRequest, LoginResponse, User } from '../models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = 'http://localhost:8000/api';
  private readonly TOKEN_KEY = 'auth_token';

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<LoginResponse> {
    const request: LoginRequest = { username, password };
    return this.http.post<LoginResponse>(`${this.API_URL}/auth/login/`, request).pipe(
      tap({
        next: response => this.setToken(response.token),
        error: error => {
          // Clear any existing token on login failure
          this.clearToken();
        },
      })
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/auth/logout/`, {}).pipe(
      tap({
        next: () => this.clearToken(),
        error: error => {
          // Clear token even if logout request fails
          this.clearToken();
        },
      })
    );
  }

  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/auth/me/`).pipe(
      tap({
        error: error => {
          // If we get an authentication error, clear the invalid token
          if (error.status === 401) {
            this.clearToken();
          }
        },
      })
    );
  }

  getToken(): string | null {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(this.TOKEN_KEY);
      return token ? token.trim() : null;
    }
    return null;
  }

  setToken(token: string): void {
    if (typeof window !== 'undefined') {
      const trimmedToken = token.trim();
      localStorage.setItem(this.TOKEN_KEY, trimmedToken);
    }
  }

  clearToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
    }
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    return token !== null && token.trim() !== '';
  }

  switchTestUser(userId: number): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.API_URL}/auth/switch-test-user/`, { user_id: userId })
      .pipe(
        tap({
          next: response => this.setToken(response.token),
          error: error => {
            // Clear any existing token on switch failure
            this.clearToken();
          },
        })
      );
  }

  getTestUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.API_URL}/users/?test_users_only=true`);
  }
}
