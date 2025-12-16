import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PermissionService } from '../../services/permission.service';
import { User } from '../../models';
import { InlineNotificationComponent } from '../shared/inline-notification/inline-notification.component';
import { NotificationsPanelComponent } from '../notifications/notifications-panel.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, InlineNotificationComponent, NotificationsPanelComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent implements OnInit {
  currentUser: User | null = null;
  testUsers: User[] = [];
  showUserSwitcher: boolean = false;

  constructor(
    private authService: AuthService,
    private permissionService: PermissionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check if this is an Okta callback first
    const isCallback = this.authService.isOktaCallback();

    if (isCallback) {
      this.handleOktaCallback();
      return;
    }

    // Load current user
    this.permissionService.currentUser$.subscribe(user => {
      this.currentUser = user;

      // If we have a token but no user data, refresh user info
      // But only if we're not in the middle of an Okta callback
      if (this.authService.isAuthenticated() && !user && !isCallback) {
        this.permissionService.refreshUser().subscribe({
          next: () => {
            // User refreshed successfully
          },
          error: (error) => {
            console.error('Failed to refresh user', error);
            // If can't get user, redirect to login
            this.router.navigate(['/login']);
          },
        });
      }

      // Load test users if current user is a test user
      if (user?.is_test_user) {
        this.loadTestUsers();
      }
    });
  }

  private handleOktaCallback(): void {
    this.authService.handleOktaCallback().subscribe({
      next: response => {
        console.log('MainLayoutComponent: Okta callback successful', {
          hasResponse: !!response,
          hasToken: !!response.token,
          hasUser: !!response.user,
          userId: response.user?.id
        });

        // Set user first
        this.permissionService.setCurrentUser(response.user);

        // Verify token is set (it should be set in authService tap operator)
        // The token is set synchronously in the tap operator, so it should be available here
        if (!this.authService.isAuthenticated()) {
          // Try setting token directly from response as fallback
          if (response.token) {
            this.authService.setToken(response.token);
          }

          // Check again
          if (!this.authService.isAuthenticated()) {
            console.error('Token not set after successful login');
            this.router.navigate(['/login'], {
              queryParams: { error: 'Authentication token not set' }
            });
            return;
          }
        }

        // Redirect to glossary after successful login
        // Use replaceUrl to avoid back button issues and clear callback URL
        this.router.navigate(['/glossary'], { replaceUrl: true }).then(
          (success) => {
            if (!success) {
              console.error('Navigation to glossary failed, redirecting to login');
              this.router.navigate(['/login']);
            }
          }
        );
      },
      error: error => {
        // Check if this is an expected error (user not assigned, access denied, etc.)
        const isExpectedError = (error as any)?.isExpectedError ||
          (error?.message && (
            error.message.includes('not assigned') ||
            error.message.includes('Access denied') ||
            error.message.includes('access_denied')
          ));

        // Only log verbose details for unexpected errors
        if (!isExpectedError) {
          console.error('Unexpected Okta callback error:', error);
        }

        // On error, redirect to login page with error message
        // Use the user-friendly message if available
        // Check multiple possible locations for the error message
        let errorMsg = error?.message;
        if (!errorMsg && (error as any)?.originalError) {
          errorMsg = (error as any).originalError.message;
        }
        if (!errorMsg && error?.error?.detail) {
          errorMsg = error.error.detail;
        }
        if (!errorMsg) {
          errorMsg = 'Okta authentication failed. Please try again or contact support if the problem persists.';
        }

        this.router.navigate(['/login'], {
          queryParams: { error: encodeURIComponent(errorMsg) },
        });
      },
    });
  }

  loadTestUsers(): void {
    this.authService.getTestUsers().subscribe({
      next: users => {
        this.testUsers = users;
      },
      error: error => {
        console.error('Failed to load test users:', error);
      },
    });
  }

  switchUser(userId: number): void {
    this.authService.switchTestUser(userId).subscribe({
      next: response => {
        // Update current user in permission service
        this.permissionService.setCurrentUser(response.user);
        // Refresh current page data by reloading
        window.location.reload();
      },
      error: error => {
        console.error('Failed to switch user:', error);
        // If switch fails, redirect to login
        this.router.navigate(['/login']);
      },
    });
  }

  toggleUserSwitcher(): void {
    this.showUserSwitcher = !this.showUserSwitcher;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const dropdown = target.closest('.relative');
    if (!dropdown && this.showUserSwitcher) {
      this.showUserSwitcher = false;
    }
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.permissionService.clearCurrentUser();
        this.router.navigate(['/login']);
      },
      error: () => {
        // Even if logout fails, clear local state
        // Note: clearOktaState() is already called in authService.logout()
        this.permissionService.clearCurrentUser();
        this.authService.clearToken();
        this.router.navigate(['/login']);
      },
    });
  }
}
