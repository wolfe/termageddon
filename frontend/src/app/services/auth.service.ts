import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, from, map, switchMap, tap } from 'rxjs';
import OktaAuth from '@okta/okta-auth-js';
import { LoginRequest, LoginResponse, PaginatedResponse, User } from '../models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = 'http://localhost:8000/api';
  private readonly TOKEN_KEY = 'auth_token';
  private readonly OKTA_CLIENT_ID = '0oa1bshbj9nLJcMSa0h8';
  private readonly OKTA_ISSUER_URI = 'https://sso.int.verisk.com/oauth2/aus1bsgyad02VnoyG0h8';
  private readonly OKTA_REDIRECT_URI = 'http://localhost:4200/callback';

  private oktaAuth: OktaAuth | null = null;

  constructor(private http: HttpClient) {
    this.initializeOkta();
  }

  private initializeOkta(): void {
    this.oktaAuth = new OktaAuth({
      issuer: this.OKTA_ISSUER_URI,
      clientId: this.OKTA_CLIENT_ID,
      redirectUri: this.OKTA_REDIRECT_URI,
      scopes: ['openid', 'profile', 'email'],
    });
  }

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
    return this.http
      .get<PaginatedResponse<User>>(`${this.API_URL}/users/`, {
        params: {
          test_users_only: 'true',
        },
      })
      .pipe(
        map(response => (Array.isArray(response.results) ? response.results : []))
      );
  }

  /**
   * Login with Okta - redirects to Okta login page
   */
  loginWithOkta(): void {
    if (!this.oktaAuth) {
      this.initializeOkta();
    }
    if (this.oktaAuth) {
      this.oktaAuth.signInWithRedirect();
    }
  }

  /**
   * Handle Okta callback after redirect - exchanges Okta token for Django token
   */
  handleOktaCallback(): Observable<LoginResponse> {
    if (!this.oktaAuth) {
      this.initializeOkta();
    }

    if (!this.oktaAuth) {
      throw new Error('Okta Auth not initialized');
    }

    // handleLoginRedirect returns Promise<void> - tokens are stored internally
    return from(this.oktaAuth.handleLoginRedirect()).pipe(
      switchMap(() => {
        // Get access token from token manager after redirect is handled
        return from(this.oktaAuth!.tokenManager.get('accessToken'));
      }),
      switchMap(accessToken => {
        if (!accessToken) {
          console.error('No access token in token manager');
          throw new Error('No access token received from Okta');
        }

        // The token object structure - Okta returns Token object with .accessToken property
        let tokenValue: string;
        if (typeof accessToken === 'string') {
          tokenValue = accessToken;
        } else {
          const tokenObj = accessToken as any;
          // Okta token object has .accessToken property (not .value)
          tokenValue = tokenObj.accessToken || tokenObj.value || tokenObj.token;

          // If still not found, log the object structure for debugging
          if (!tokenValue) {
            console.error('Token object structure:', Object.keys(tokenObj));
            console.error('Full token object:', tokenObj);
            throw new Error(`No valid access token value found. Token object keys: ${Object.keys(tokenObj).join(', ')}`);
          }
        }

        if (typeof tokenValue !== 'string') {
          throw new Error(`Access token value is not a string: ${typeof tokenValue}`);
        }

        // Exchange Okta token for Django token
        return this.http.post<LoginResponse>(`${this.API_URL}/auth/okta-login/`, {
          okta_token: tokenValue,
        });
      }),
      tap({
        next: response => {
          this.setToken(response.token);
        },
        error: error => {
          console.error('Okta callback error:', error);
          console.error('Error status:', error.status);
          console.error('Error message:', error.message);
          console.error('Error details:', error.error);
          // Clear any existing token on login failure
          this.clearToken();
        },
      })
    );
  }

  /**
   * Check if current URL is the Okta callback
   */
  isOktaCallback(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    // Check if we're on the callback path and have Okta callback parameters
    const urlParams = new URLSearchParams(window.location.search);
    return window.location.pathname === '/callback' && (urlParams.has('code') || urlParams.has('error'));
  }
}
