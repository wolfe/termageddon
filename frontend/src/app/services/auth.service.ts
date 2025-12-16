import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, from, map, of, shareReplay, switchMap, tap, throwError } from 'rxjs';
import OktaAuth from '@okta/okta-auth-js';
import { LoginRequest, LoginResponse, PaginatedResponse, User } from '../models';

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

  constructor(private http: HttpClient) {}

  private getOktaConfig(): Observable<OktaConfig> {
    if (!this.oktaConfig$) {
      this.oktaConfig$ = this.http.get<OktaConfig>(`${this.API_URL}/auth/okta-config/`).pipe(
        shareReplay(1)
      );
    }
    return this.oktaConfig$;
  }

  private initializeOkta(config: OktaConfig, clearStorage: boolean = false): void {
    // Clear any existing Okta auth instance and transactions
    if (this.oktaAuth) {
      try {
        this.oktaAuth.tokenManager.clear();
      } catch (e) {
        // Ignore errors when clearing
      }
    }

    // Only clear stale transactions if explicitly requested (e.g., when starting new login)
    // Don't clear when handling callback, as Okta needs the transaction data
    if (clearStorage) {
      try {
        const storageKeys = Object.keys(localStorage);
        storageKeys.forEach(key => {
          if (key.startsWith('okta-') || key.includes('oktaAuth')) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        // Ignore errors when clearing storage
      }
    }

    this.oktaAuth = new OktaAuth({
      issuer: config.issuer_uri,
      clientId: config.client_id,
      redirectUri: config.redirect_uri,
      scopes: ['openid', 'profile', 'email'],
      restoreOriginalUri: async (oktaAuth, originalUri) => {
        // Restore the original URI after redirect
        window.location.href = originalUri || '/';
      },
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
    this.getOktaConfig().subscribe({
      next: config => {
        try {
          if (!this.oktaAuth) {
            // Clear storage when starting a new login
            this.initializeOkta(config, true);
          }
          if (this.oktaAuth) {
            this.oktaAuth.signInWithRedirect().catch(error => {
              console.error('Failed to initiate Okta sign-in:', error);
            });
          }
        } catch (error) {
          console.error('Error initializing Okta:', error);
        }
      },
      error: error => {
        console.error('Failed to load Okta configuration:', error);
      },
    });
  }

  /**
   * Handle Okta callback after redirect - exchanges Okta token for Django token
   */
  handleOktaCallback(): Observable<LoginResponse> {
    return this.getOktaConfig().pipe(
      switchMap(config => {
        // Check callback URL parameters
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);

          // Check if there's an error in the URL
          if (urlParams.has('error')) {
            const error = urlParams.get('error');
            const errorDescription = urlParams.get('error_description');
            const errorMsg = `Okta returned error: ${error}${errorDescription ? ' - ' + errorDescription : ''}`;
            // This is an expected error from Okta, log briefly
            console.log('Okta authentication error:', errorMsg);
            return throwError(() => new Error(errorMsg));
          }

          // Check if we have a code
          if (!urlParams.has('code')) {
            return throwError(() => new Error('No authorization code in callback URL'));
          }
        }

        if (!this.oktaAuth) {
          this.initializeOkta(config);
        }

        if (!this.oktaAuth) {
          return throwError(() => new Error('Okta Auth not initialized'));
        }

        // handleLoginRedirect processes the callback and exchanges code for tokens
        // It stores tokens in the token manager, then we retrieve them
        return from(
          this.oktaAuth.handleLoginRedirect().then(async () => {
            if (!this.oktaAuth) {
              throw new Error('Okta Auth not initialized');
            }

            // After handleLoginRedirect, tokens are stored in token manager
            // Use getTokens() to retrieve all tokens asynchronously
            const tokens = await this.oktaAuth.tokenManager.getTokens();

            // Get access token - it's a Token object with .value property containing the JWT
            let accessToken = tokens.accessToken;

            if (!accessToken) {
              // Try getting it directly
              const tokenFromManager = await this.oktaAuth.tokenManager.get('accessToken');
              if (tokenFromManager) {
                accessToken = tokenFromManager as any;
              }
            }

            if (!accessToken) {
              // Only log if this is an unexpected error (not a user assignment issue)
              const isUserAssignmentError = false; // This would be set if we detect it
              if (!isUserAssignmentError) {
                console.error('No access token found after handleLoginRedirect');
              }

              // Store debug info
              try {
                const tokenDetails: Record<string, any> = {};
                if (tokens.accessToken) {
                  const token = tokens.accessToken as any;
                  tokenDetails['accessToken'] = {
                    type: typeof token,
                    keys: typeof token === 'object' ? Object.keys(token) : null,
                    hasValue: typeof token === 'object' && 'value' in token
                  };
                }
                if (tokens.idToken) {
                  const token = tokens.idToken as any;
                  tokenDetails['idToken'] = {
                    type: typeof token,
                    keys: typeof token === 'object' ? Object.keys(token) : null,
                    hasValue: typeof token === 'object' && 'value' in token
                  };
                }
                localStorage.setItem('okta_error_debug', JSON.stringify({
                  error: 'No access token found',
                  availableTokens: Object.keys(tokens),
                  tokenDetails: tokenDetails
                }));
              } catch (e) {
                // Ignore
              }

              throw new Error('No access token found in token manager after redirect');
            }

            return accessToken;
          }).catch(error => {
            // Transform error to user-friendly message
            let userMessage = 'Okta authentication failed';
            const isExpectedError = error.message && (
              error.message.includes('not assigned to the client application') ||
              error.message.includes('not assigned to the Okta application') ||
              error.message.includes('access_denied') ||
              error.message.includes('Access denied')
            );

            if (error.message) {
              if (error.message.includes('not assigned to the client application') ||
                  error.message.includes('not assigned to the Okta application')) {
                userMessage = 'Your account is not assigned to this application. Please contact your administrator to request access.';
              } else if (error.message.includes('access_denied') || error.message.includes('Access denied')) {
                userMessage = 'Access denied. You may not have permission to access this application. Please contact your administrator.';
              } else {
                userMessage = error.message;
              }
            }

            // Only log verbose details for unexpected errors
            if (!isExpectedError) {
              console.error('Unexpected error in handleLoginRedirect:', error);
              console.error('Error message:', error.message);
            } else {
              // For expected errors, just log a brief message
              console.log('Okta authentication failed:', userMessage);
            }

            // Store error for debugging (only for unexpected errors or if needed)
            if (!isExpectedError) {
              try {
                localStorage.setItem('okta_error_debug', JSON.stringify({
                  error: error.message,
                  userMessage: userMessage,
                  stack: error.stack,
                  name: error.name,
                  timestamp: new Date().toISOString()
                }));
              } catch (e) {
                // Ignore
              }
            }

            // Throw error with user-friendly message
            const friendlyError = new Error(userMessage);
            (friendlyError as any).originalError = error;
            (friendlyError as any).isExpectedError = isExpectedError;
            throw friendlyError;
          })
        );
      }),
      switchMap(accessToken => {
        if (!accessToken) {
          console.error('No access token in token manager');
          throw new Error('No access token received from Okta');
        }

        // The token object structure - Okta returns Token object
        // Token objects have a .value property that contains the actual JWT string
        let tokenValue: string;
        if (typeof accessToken === 'string') {
          tokenValue = accessToken;
        } else {
          const tokenObj = accessToken as any;
          // Okta Token object structure: { value: string, claims: object, ... }
          // The actual JWT token string is in the .value property
          tokenValue = tokenObj.value || tokenObj.accessToken || tokenObj.token || tokenObj.idToken;

          // If still not found, log the object structure for debugging
          if (!tokenValue) {
            console.error('Token object structure:', Object.keys(tokenObj));
            console.error('Full token object:', tokenObj);
            // Try to stringify to see the full structure
            try {
              console.error('Token object JSON:', JSON.stringify(tokenObj, null, 2));
            } catch (e) {
              console.error('Could not stringify token object');
            }
            throw new Error(`No valid access token value found. Token object keys: ${Object.keys(tokenObj).join(', ')}`);
          }
        }

        if (typeof tokenValue !== 'string') {
          throw new Error(`Access token value is not a string: ${typeof tokenValue}`);
        }

        console.log('Extracted access token value, length:', tokenValue.length);

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
          // Errors are already handled and transformed in the catch block above
          // Just clear the token on any error
          this.clearToken();

          // Re-throw the error (it's already been transformed to be user-friendly)
          throw error;
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

  /**
   * Clear all Okta-related storage and auth tokens (for debugging)
   */
  clearAllStorage(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // Clear Okta auth instance
    if (this.oktaAuth) {
      try {
        this.oktaAuth.tokenManager.clear();
      } catch (e) {
        // Ignore errors when clearing
      }
      this.oktaAuth = null;
    }

    // Clear localStorage
    const localStorageKeys: string[] = [];
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.toLowerCase().includes('okta') || key === 'auth_token')) {
        localStorageKeys.push(key);
        localStorage.removeItem(key);
      }
    }

    // Clear sessionStorage
    const sessionStorageKeys: string[] = [];
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key && key.toLowerCase().includes('okta')) {
        sessionStorageKeys.push(key);
        sessionStorage.removeItem(key);
      }
    }

    // Reset cached config
    this.oktaConfig$ = null;

    console.log('Cleared storage:', {
      localStorage: localStorageKeys,
      sessionStorage: sessionStorageKeys,
    });
  }
}
