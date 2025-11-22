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
