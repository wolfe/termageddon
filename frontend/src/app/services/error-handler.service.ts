import { Injectable, ErrorHandler, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class GlobalErrorHandler implements ErrorHandler {
  private router = inject(Router);
  private authService = inject(AuthService);

  handleError(error: any): void {
    console.error('Global error:', error);

    // Check if it's an authentication error
    if (error?.status === 401 || error?.status === 403) {
      this.authService.clearToken();
      this.router.navigate(['/login']);
    }
  }
}
