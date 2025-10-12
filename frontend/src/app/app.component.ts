import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from './services/auth.service';
import { PermissionService } from './services/permission.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  template: `
    <router-outlet></router-outlet>
  `,
  styles: [],
})
export class AppComponent implements OnInit {
  title = 'Termageddon';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    // Check for auto-login token in URL
    this.checkForAutoLogin();
  }

  private checkForAutoLogin(): void {
    // Get token from URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const username = urlParams.get('username');

    if (token && username) {
      console.log('Auto-login detected:', { username, token: token.substring(0, 10) + '...' });
      
      // Set the token in localStorage
      this.authService.setToken(token);
      
      // Get user info and set current user
      this.authService.getCurrentUser().subscribe({
        next: (user) => {
          console.log('Auto-login successful for:', user.username);
          this.permissionService.setCurrentUser(user);
          
          // Clean up URL by removing token parameters
          this.cleanUrl();
        },
        error: (error) => {
          console.error('Auto-login failed:', error);
          // Clear invalid token
          this.authService.clearToken();
          // Clean up URL
          this.cleanUrl();
        }
      });
    }
  }

  private cleanUrl(): void {
    // Remove token and username from URL without page reload
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    url.searchParams.delete('username');
    
    // Update URL without triggering navigation
    window.history.replaceState({}, '', url.toString());
  }
}
