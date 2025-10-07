import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { AuthHelper } from './helpers/auth';
import { TEST_USERS, TEST_MESSAGES } from './fixtures/testData';

test.describe('Authentication', () => {
  let loginPage: LoginPage;
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    authHelper = new AuthHelper(page);
  });

  test.describe('Login Form', () => {
    test('should display login form elements', async () => {
      await loginPage.goto();
      await loginPage.expectLoginFormVisible();
      await loginPage.expectTestCredentialsVisible();
    });

    test('should show validation errors for empty fields', async () => {
      await loginPage.goto();
      await loginPage.expectUsernameRequired();
      await loginPage.expectPasswordRequired();
    });

    test('should disable submit button when form is invalid', async () => {
      await loginPage.goto();
      await loginPage.expectSubmitButtonDisabled();
    });

    test('should enable submit button when form is valid', async () => {
      await loginPage.goto();
      await loginPage.usernameInput.fill('test');
      await loginPage.passwordInput.fill('test');
      await loginPage.expectSubmitButtonEnabled();
    });
  });

  test.describe('Successful Login', () => {
    test('should login as admin successfully', async () => {
      await loginPage.goto();
      await loginPage.loginAsAdmin();
      expect(await authHelper.isLoggedIn()).toBe(true);
    });

    test('should login as Maria Carter successfully', async () => {
      await loginPage.goto();
      await loginPage.loginAsMariaCarter();
      expect(await authHelper.isLoggedIn()).toBe(true);
    });

    test('should login as Ben Carter successfully', async () => {
      await loginPage.goto();
      await loginPage.loginAsBenCarter();
      expect(await authHelper.isLoggedIn()).toBe(true);
    });

    test('should login as Sofia Rossi successfully', async () => {
      await loginPage.goto();
      await loginPage.loginAsSofiaRossi();
      expect(await authHelper.isLoggedIn()).toBe(true);
    });

    test('should login as Leo Schmidt successfully', async () => {
      await loginPage.goto();
      await loginPage.loginAsLeoSchmidt();
      expect(await authHelper.isLoggedIn()).toBe(true);
    });

    test('should login as Kenji Tanaka successfully', async () => {
      await loginPage.goto();
      await loginPage.loginAsKenjiTanaka();
      expect(await authHelper.isLoggedIn()).toBe(true);
    });
  });

  test.describe('Failed Login', () => {
    test('should show error for invalid credentials', async () => {
      await loginPage.goto();
      await loginPage.login('invalid', 'invalid');
      await loginPage.expectErrorMessage(TEST_MESSAGES.LOGIN_ERROR);
    });

    test('should show error for empty username', async () => {
      await loginPage.goto();
      await loginPage.passwordInput.fill('password');
      // Trigger validation by clicking outside the field
      await loginPage.passwordInput.blur();
      await loginPage.expectUsernameRequired();
    });

    test('should show error for empty password', async () => {
      await loginPage.goto();
      await loginPage.usernameInput.fill('username');
      // Trigger validation by clicking outside the field
      await loginPage.usernameInput.blur();
      await loginPage.expectPasswordRequired();
    });

    test('should show error for wrong password', async () => {
      await loginPage.goto();
      await loginPage.login('admin', 'wrongpassword');
      await loginPage.expectErrorMessage(TEST_MESSAGES.LOGIN_ERROR);
    });
  });

  test.describe('Session Management', () => {
    test('should maintain session after page refresh', async () => {
      await authHelper.loginAsAdmin();
      await loginPage.page.reload();
      expect(await authHelper.isLoggedIn()).toBe(true);
    });

    test('should logout successfully', async () => {
      await authHelper.loginAsAdmin();
      await authHelper.logout();
      expect(await authHelper.isLoggedIn()).toBe(false);
    });

    test('should redirect to login when not authenticated', async () => {
      await loginPage.page.goto('/');
      // Wait for either login page or check if we're already on login
      try {
        await loginPage.page.waitForURL('**/login', { timeout: 5000 });
      } catch {
        // If not redirected, check if we're already on login page
        const currentUrl = loginPage.page.url();
        expect(currentUrl).toContain('/login');
      }
    });
  });

  test.describe('User Permissions', () => {
    test('should have correct domain access for Maria Carter', async () => {
      await authHelper.loginAsMariaCarter();
      const domains = authHelper.getUserDomains('MARIA_CARTER');
      expect(domains).toContain('Physics');
      expect(domains).toContain('Chemistry');
    });

    test('should have correct domain access for Ben Carter', async () => {
      await authHelper.loginAsBenCarter();
      const domains = authHelper.getUserDomains('BEN_CARTER');
      expect(domains).toContain('Chemistry');
      expect(domains).toContain('Biology');
    });

    test('should have correct domain access for Sofia Rossi', async () => {
      await authHelper.loginAsSofiaRossi();
      const domains = authHelper.getUserDomains('SOFIA_ROSSI');
      expect(domains).toContain('Computer Science');
      expect(domains).toContain('Graph Theory');
    });

    test('should have correct domain access for Leo Schmidt', async () => {
      await authHelper.loginAsLeoSchmidt();
      const domains = authHelper.getUserDomains('LEO_SCHMIDT');
      expect(domains).toContain('Biology');
      expect(domains).toContain('Geology');
    });

    test('should have correct domain access for Kenji Tanaka', async () => {
      await authHelper.loginAsKenjiTanaka();
      const domains = authHelper.getUserDomains('KENJI_TANAKA');
      expect(domains).toContain('Physics');
      expect(domains).toContain('Geology');
    });
  });

  test.describe('Approval Pairs', () => {
    test('should identify correct approval pairs', async () => {
      const pairs = authHelper.getApprovalPairs();
      
      // Maria and Ben should be able to approve each other (Chemistry domain)
      const mariaBenPair = pairs.find(p => 
        p.approver === 'MARIA_CARTER' && p.author === 'BEN_CARTER'
      );
      expect(mariaBenPair).toBeDefined();
      
      // Maria and Kenji should be able to approve each other (Physics domain)
      const mariaKenjiPair = pairs.find(p => 
        p.approver === 'MARIA_CARTER' && p.author === 'KENJI_TANAKA'
      );
      expect(mariaKenjiPair).toBeDefined();
      
      // Ben and Leo should be able to approve each other (Biology domain)
      const benLeoPair = pairs.find(p => 
        p.approver === 'BEN_CARTER' && p.author === 'LEO_SCHMIDT'
      );
      expect(benLeoPair).toBeDefined();
    });
  });

  test.describe('Form Interactions', () => {
    test('should clear form when clear button is clicked', async () => {
      await loginPage.goto();
      await loginPage.usernameInput.fill('test');
      await loginPage.passwordInput.fill('test');
      await loginPage.clearForm();
      
      await expect(loginPage.usernameInput).toHaveValue('');
      await expect(loginPage.passwordInput).toHaveValue('');
    });

    test('should show loading state during login', async () => {
      await loginPage.goto();
      await loginPage.usernameInput.fill('admin');
      await loginPage.passwordInput.fill('admin');
      
      // Click submit and check for loading state
      await loginPage.submitButton.click();
      await expect(loginPage.submitButton).toContainText('Logging in...');
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper form labels', async () => {
      await loginPage.goto();
      
      const usernameLabel = loginPage.page.locator('label[for="username"]');
      const passwordLabel = loginPage.page.locator('label[for="password"]');
      
      await expect(usernameLabel).toHaveText('Username');
      await expect(passwordLabel).toHaveText('Password');
    });

    test('should have proper input types', async () => {
      await loginPage.goto();
      
      await expect(loginPage.usernameInput).toHaveAttribute('type', 'text');
      await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
    });

    test('should have proper form validation attributes', async () => {
      await loginPage.goto();
      
      // Check that form validation works (Angular reactive forms)
      await expect(loginPage.usernameInput).toHaveAttribute('formcontrolname', 'username');
      await expect(loginPage.passwordInput).toHaveAttribute('formcontrolname', 'password');
      
      // Check that validation messages appear when fields are touched
      await loginPage.usernameInput.click();
      await loginPage.passwordInput.click();
      await loginPage.usernameInput.click();
      
      // Should show validation error
      await expect(loginPage.page.locator('text=Username is required')).toBeVisible();
    });
  });
});