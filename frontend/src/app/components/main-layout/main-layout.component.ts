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
    console.log('MainLayoutComponent ngOnInit - isOktaCallback:', isCallback);
    console.log('Current URL:', window.location.href);
    console.log('Current pathname:', window.location.pathname);

    if (isCallback) {
      console.log('Handling Okta callback in MainLayoutComponent');
      this.handleOktaCallback();
      return;
    }

    // Load current user
    this.permissionService.currentUser$.subscribe(user => {
      this.currentUser = user;

      // If we have a token but no user data, refresh user info
      if (this.authService.isAuthenticated() && !user) {
        this.permissionService.refreshUser().subscribe({
          error: () => {
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
        this.permissionService.setCurrentUser(response.user);
        // Redirect to glossary after successful login
        this.router.navigate(['/glossary']);
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
          console.error('Error status:', error.status);
          console.error('Error message:', error.message);
          console.error('Error details:', error.error);
        } else {
          // For expected errors, just log a brief message
          console.log('Okta authentication failed:', error?.message || 'User not authorized');
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
        this.permissionService.clearCurrentUser();
        this.authService.clearToken();
        this.router.navigate(['/login']);
      },
    });
  }
}
