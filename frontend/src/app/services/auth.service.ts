import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, from, throwError } from 'rxjs';
import { map, tap, switchMap, catchError, shareReplay, finalize } from 'rxjs/operators';
import { LoginRequest, LoginResponse, PaginatedResponse, User } from '../models';
import OktaAuth, { AccessToken } from '@okta/okta-auth-js';

interface OktaConfig {
  client_id: string;
  issuer_uri: string;
  redirect_uri: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = 'http://localhost:8000/api';
  private readonly TOKEN_KEY = 'auth_token';

  private oktaAuth: OktaAuth | null = null;
  private oktaConfig$: Observable<OktaConfig> | null = null;
  private isLoginInProgress: boolean = false;

  constructor(private http: HttpClient, private router: Router) {}

  private getOktaConfig(): Observable<OktaConfig> {
    if (!this.oktaConfig$) {
      this.oktaConfig$ = this.http.get<OktaConfig>(`${this.API_URL}/auth/okta-config/`).pipe(
        shareReplay(1)
      );
    }
    return this.oktaConfig$;
  }

  private initializeOkta(config: OktaConfig, clearStorage: boolean = false): void {
    // Clear any existing Okta auth instance
    if (this.oktaAuth) {
      try {
        this.oktaAuth.tokenManager.clear();
      } catch (e) {
        // Ignore errors when clearing
      }
      // Null out the instance to ensure fresh state
      this.oktaAuth = null;
    }

    // Only clear stale transactions if explicitly requested (e.g., when starting new login)
    // CRITICAL: Don't clear when handling callback, as Okta needs the transaction data
    // to complete the OAuth flow. Clearing it will break the callback.
    if (clearStorage) {
      try {
        const storageKeys = Object.keys(localStorage);
        storageKeys.forEach(key => {
          if (key.startsWith('okta-') || key.includes('oktaAuth')) {
            localStorage.removeItem(key);
          }
        });
        // Also clear sessionStorage
        const sessionStorageKeys = Object.keys(sessionStorage);
        sessionStorageKeys.forEach(key => {
          if (key.toLowerCase().includes('okta')) {
            sessionStorage.removeItem(key);
          }
        });
      } catch (e) {
        // Ignore errors when clearing storage
      }
    }

    // Always create a fresh instance
    // Note: We don't set restoreOriginalUri here because we handle navigation
    // ourselves after the backend login completes in MainLayoutComponent
    this.oktaAuth = new OktaAuth({
      issuer: config.issuer_uri,
      clientId: config.client_id,
      redirectUri: config.redirect_uri,
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
        next: () => {
          this.clearToken();
          this.clearOktaState();
        },
        error: error => {
          // Clear token and Okta state even if logout request fails
          this.clearToken();
          this.clearOktaState();
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
    // Prevent multiple simultaneous login attempts
    if (this.isLoginInProgress) {
      return;
    }

    // Don't proceed if we're already on a callback - that would break the callback
    if (this.isOktaCallback()) {
      return;
    }

    this.isLoginInProgress = true;

    // Fetch config and initialize Okta if needed
    // Note: We don't clear state here - signInWithRedirect() will create a new transaction
    // State is only cleared on explicit logout
    this.getOktaConfig().subscribe({
      next: config => {
        try {
          // Initialize Okta instance if needed
          // Don't clear storage - let Okta handle transaction state internally
          if (!this.oktaAuth) {
            this.initializeOkta(config, false);
          }

          if (this.oktaAuth) {
            this.oktaAuth.signInWithRedirect().catch(error => {
              console.error('Okta signInWithRedirect failed', error);
              this.isLoginInProgress = false;
            });
            // Note: isLoginInProgress will be reset after redirect (page reload)
          } else {
            console.error('Okta auth instance not created');
            this.isLoginInProgress = false;
          }
        } catch (error) {
          console.error('Error initializing Okta:', error);
          this.isLoginInProgress = false;
        }
      },
      error: error => {
        console.error('Failed to load Okta configuration:', error);
        this.isLoginInProgress = false;
      },
    });
  }

  /**
   * Handle Okta callback after redirect - exchanges Okta token for Django token
   */
  handleOktaCallback(): Observable<LoginResponse> {
    // Fetch config and initialize Okta if needed
    // CRITICAL: Do NOT clear storage when handling callback - Okta needs the transaction state
    return this.getOktaConfig().pipe(
      switchMap(config => {
        if (!this.oktaAuth) {
          // Initialize without clearing storage - we need the transaction state
          this.initializeOkta(config, false);
        }

        if (!this.oktaAuth) {
          return throwError(() => new Error('Okta Auth not initialized'));
        }

        return from(this.oktaAuth.handleRedirect());
      }),
      switchMap(() => {
        return from(this.oktaAuth!.tokenManager.get('accessToken'));
      }),
      switchMap((token) => {
        const accessToken = token as AccessToken | undefined;

        if (!accessToken || !accessToken.accessToken) {
          return throwError(() => new Error('No access token received from Okta'));
        }

        // Exchange Okta token for Django token
        return this.http.post<LoginResponse>(`${this.API_URL}/auth/okta-login/`, {
          okta_token: accessToken.accessToken
        }).pipe(
          tap({
            next: (response) => {
              // Set token immediately and synchronously
              this.setToken(response.token);
            },
            error: (error) => {
              console.error('Backend login failed', {
                status: error.status,
                statusText: error.statusText,
                message: error.message
              });
              this.clearToken();
            }
          }),
          map((response) => {
            // Double-check token is set
            if (!this.isAuthenticated()) {
              console.error('Token not set after login, attempting to set again');
              this.setToken(response.token);
            }
            return response;
          })
        );
      }),
      catchError((error: any) => {
        // Clear token on any error
        this.clearToken();

        // Extract error message for display
        let errorMessage = 'Okta authentication failed';
        if (error?.error?.detail) {
          errorMessage = error.error.detail;
        } else if (error?.message) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }

        // Navigate to login with error message
        this.router.navigate(['/login'], {
          queryParams: { error: encodeURIComponent(errorMessage) }
        });

        // Return error - navigation already handled, don't throw to avoid double handling
        return throwError(() => new Error(errorMessage));
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

  /**
   * Clear Okta state (tokens, storage, instance)
   * WARNING: Do NOT call this during callback handling - it will break the OAuth flow
   */
  private clearOktaState(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // Don't clear state if we're on a callback - that would break the OAuth flow
    if (this.isOktaCallback()) {
      return;
    }

    // Clear Okta auth instance
    if (this.oktaAuth) {
      try {
        this.oktaAuth.tokenManager.clear();
      } catch (e) {
        console.error('Error clearing Okta tokenManager', e);
      }
      this.oktaAuth = null;
    }

    // Clear localStorage Okta keys
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.toLowerCase().includes('okta')) {
        localStorage.removeItem(key);
      }
    }

    // Clear sessionStorage Okta keys
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key && key.toLowerCase().includes('okta')) {
        sessionStorage.removeItem(key);
      }
    }

    // Reset cached config
    this.oktaConfig$ = null;
  }

  /**
   * Clear all Okta-related storage and auth tokens (for debugging)
   */
  clearAllStorage(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // Clear Okta state
    this.clearOktaState();

    // Also clear auth token
    this.clearToken();
  }
}
