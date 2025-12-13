import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Allow Okta callback through (it will be handled in MainLayoutComponent)
  if (authService.isOktaCallback()) {
    return true;
  }

  // Check if user is authenticated
  if (authService.isAuthenticated()) {
    return true;
  }

  // Clear any invalid token and redirect to login
  authService.clearToken();
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};
