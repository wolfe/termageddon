import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PermissionService } from '../../services/permission.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-login',
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './login.component.html',
    styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;
  showTestUserLogin: boolean = false;
  private queryParamsSubscription?: Subscription;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private permissionService: PermissionService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    // Check initial query params (in case component is already loaded)
    const initialErrorParam = this.route.snapshot.queryParams['error'];
    if (initialErrorParam) {
      try {
        const decodedError = decodeURIComponent(initialErrorParam);
        this.errorMessage = this.formatErrorMessage(decodedError);
      } catch (e) {
        console.error('LoginComponent: Error decoding error param', e);
        this.errorMessage = this.formatErrorMessage(initialErrorParam);
      }
      this.cdr.detectChanges();
    }

    // Subscribe to query params to catch changes (including when navigating to login with error)
    this.queryParamsSubscription = this.route.queryParams.subscribe(params => {
      const errorParam = params['error'];
      if (errorParam) {
        try {
          // Decode the error message (it's URL-encoded)
          const decodedError = decodeURIComponent(errorParam);
          this.errorMessage = this.formatErrorMessage(decodedError);
        } catch (e) {
          console.error('LoginComponent: Error decoding error param in subscription', e);
          this.errorMessage = this.formatErrorMessage(errorParam);
        }
      } else {
        // Clear error message if no error param
        this.errorMessage = '';
      }
      this.cdr.detectChanges();
    });

    // Note: Okta callbacks are handled by MainLayoutComponent, not LoginComponent
    // If we're on /login with callback params, it means the callback failed and redirected here
    // Don't try to handle it again - just show the error if present
  }

  ngOnDestroy(): void {
    if (this.queryParamsSubscription) {
      this.queryParamsSubscription.unsubscribe();
    }
  }

  private formatErrorMessage(error: string): string {
    // Handle common error messages with user-friendly text
    if (error.includes('not assigned to the client application') ||
        error.includes('not assigned to the Okta application')) {
      return 'Your account is not assigned to this application. Please contact your administrator to request access.';
    }
    if (error.includes('access_denied') || error.includes('Access denied')) {
      return 'Access denied. You may not have permission to access this application. Please contact your administrator.';
    }
    if (error === 'okta_auth_failed') {
      return 'Okta authentication failed. Please try again or contact support if the problem persists.';
    }
    // Return the error message as-is if it's already user-friendly
    return error;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { username, password } = this.loginForm.value;

    this.authService.login(username, password).subscribe({
      next: response => {
        this.permissionService.setCurrentUser(response.user);
        // Redirect to return URL or default to glossary
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/glossary';
        this.router.navigate([returnUrl]);
      },
      error: error => {
        this.isLoading = false;
        this.errorMessage = error.error?.detail || 'Invalid username or password';
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  loginWithOkta(): void {
    this.authService.loginWithOkta();
  }

  toggleTestUserLogin(): void {
    this.showTestUserLogin = !this.showTestUserLogin;
  }

  clearState(): void {
    this.authService.clearAllStorage();
    // Show a brief confirmation
    const originalMessage = this.errorMessage;
    this.errorMessage = 'Storage cleared. Ready for clean test.';
    setTimeout(() => {
      this.errorMessage = originalMessage;
    }, 2000);
  }

  private handleOktaCallback(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.handleOktaCallback().subscribe({
      next: response => {
        this.permissionService.setCurrentUser(response.user);
        // Redirect to return URL or default to glossary
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/glossary';
        this.router.navigate([returnUrl]);
      },
      error: error => {
        this.isLoading = false;
        const errorMsg = error?.message || error?.error?.detail || 'Okta authentication failed';
        this.errorMessage = this.formatErrorMessage(errorMsg);
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }
}
