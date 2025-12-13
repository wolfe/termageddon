import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PermissionService } from '../../services/permission.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;
  showTestUserLogin: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private permissionService: PermissionService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    // Check if this is an Okta callback
    if (this.authService.isOktaCallback()) {
      this.handleOktaCallback();
    }
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
        this.errorMessage = error.error?.detail || 'Okta authentication failed';
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }
}
