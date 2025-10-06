import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PermissionService } from '../../services/permission.service';
import { User } from '../../models';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent implements OnInit {
  currentUser: User | null = null;

  constructor(
    private authService: AuthService,
    private permissionService: PermissionService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // Load current user
    this.permissionService.currentUser$.subscribe((user) => {
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
    });
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
