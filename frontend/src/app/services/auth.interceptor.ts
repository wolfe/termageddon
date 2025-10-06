import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  // If no token and not a login request, redirect to login
  if (!token && !req.url.includes('/auth/login/')) {
    router.navigate(['/login']);
    return throwError(() => new Error('No authentication token'));
  }

  if (token) {
    const clonedReq = req.clone({
      setHeaders: {
        Authorization: `Token ${token}`,
      },
    });
    return next(clonedReq).pipe(
      catchError((error) => {
        // If we get a 401 or 403 error, the token is invalid or expired
        if (error.status === 401 || error.status === 403) {
          authService.clearToken();
          router.navigate(['/login']);
        }
        return throwError(() => error);
      }),
    );
  }

  return next(req);
};
