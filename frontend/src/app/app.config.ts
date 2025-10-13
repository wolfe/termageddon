import {
  ApplicationConfig,
  provideZoneChangeDetection,
  ErrorHandler,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './services/auth.interceptor';
import { GlobalErrorHandler } from './services/error-handler.service';
import { DemoAutoLoginService } from './services/demo-auto-login.service';

// Check if demo mode is enabled
function isDemoModeEnabled(): boolean {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const demo = urlParams.get('demo');
    return demo === 'true';
  }
  return false;
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    // Only provide DemoAutoLoginService if demo mode is enabled
    ...(isDemoModeEnabled() ? [DemoAutoLoginService] : []),
  ],
};
