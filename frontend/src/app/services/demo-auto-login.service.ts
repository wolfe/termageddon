import { Injectable, Optional } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from './auth.service';
import { PermissionService } from './permission.service';

/**
 * Demo Auto-Login Service
 *
 * This service provides auto-login functionality for demo mode.
 * It should only be enabled when the app is launched from demo.sh
 * with token and username query parameters.
 *
 * To enable: Set window['DEMO_MODE'] = true before bootstrapping the app
 */
@Injectable()
export class DemoAutoLoginService {
  private isEnabled = false;

  constructor(
    private router: Router,
    @Optional() private route: ActivatedRoute,
    @Optional() private authService: AuthService,
    @Optional() private permissionService: PermissionService
  ) {
    // Check if demo mode is enabled
    this.isEnabled = this.checkDemoModeEnabled();

    if (this.isEnabled) {
      console.log('Demo auto-login service enabled');
      this.checkForAutoLogin();
    }
  }

  /**
   * Check if demo mode is enabled
   */
  private checkDemoModeEnabled(): boolean {
    // Check if demo mode flag is set
    if (typeof window !== 'undefined' && (window as any)['DEMO_MODE']) {
      return true;
    }

    // Check for demo mode in URL parameters
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const demo = urlParams.get('demo');

      // Demo mode is enabled if demo=true is in URL
      if (demo === 'true') {
        return true;
      }

      // Also enable if token and username are present (legacy behavior)
      const token = urlParams.get('token');
      const username = urlParams.get('username');
      return !!(token && username);
    }

    return false;
  }

  /**
   * Check for auto-login token in URL and perform auto-login
   */
  private checkForAutoLogin(): void {
    // Only proceed if we're in a browser environment and services are available
    if (typeof window === 'undefined' || !this.authService || !this.permissionService) {
      console.warn('Demo auto-login: Browser environment or services not available');
      return;
    }

    // Get token from URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const username = urlParams.get('username');

    if (token && username) {
      console.log('Demo auto-login detected:', { username, token: token.substring(0, 10) + '...' });

      // Set the token in localStorage
      this.authService.setToken(token);

      // Get user info and set current user
      this.authService.getCurrentUser().subscribe({
        next: user => {
          console.log('Demo auto-login successful for:', user.username);
          this.permissionService.setCurrentUser(user);

          // Clean up URL by removing token parameters
          this.cleanUrl();
        },
        error: error => {
          console.error('Demo auto-login failed:', error);
          // Clear invalid token
          this.authService.clearToken();
          // Clean up URL
          this.cleanUrl();
        },
      });
    }
  }

  /**
   * Clean up URL by removing demo parameters
   */
  private cleanUrl(): void {
    // Only clean URL if we're in a browser environment
    if (typeof window === 'undefined') return;

    // Remove demo-related parameters from URL without page reload
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    url.searchParams.delete('username');
    url.searchParams.delete('demo');

    // Update URL without triggering navigation
    window.history.replaceState({}, '', url.toString());
  }

  /**
   * Check if the service is enabled
   */
  public isDemoModeEnabled(): boolean {
    return this.isEnabled;
  }
}
