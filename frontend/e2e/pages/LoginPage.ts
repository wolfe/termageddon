import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Locators
  get usernameInput() {
    return this.getByTestId('username-input');
  }

  get passwordInput() {
    return this.getByTestId('password-input');
  }

  get submitButton() {
    return this.getByTestId('login-submit-button');
  }

  get errorMessage() {
    return this.page.locator('.bg-orange-100.border-orange-400');
  }

  get testCredentials() {
    return this.page.locator('.bg-blue-50.border-blue-200');
  }

  // Actions
  async goto() {
    await this.page.goto('/login');
    await this.waitForNavigation();
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    
    // Wait for navigation away from login page or for error message
    try {
      await this.page.waitForURL(url => !url.toString().includes('/login'), { timeout: 10000 });
      
      // Wait for authentication token to be stored
      await this.page.waitForFunction(() => {
        return localStorage.getItem('auth_token') !== null;
      }, { timeout: 5000 });
      
    } catch (error) {
      // If navigation doesn't happen, check for error message
      const errorVisible = await this.errorMessage.isVisible();
      if (!errorVisible) {
        throw error; // Re-throw if it's not an expected error case
      }
    }
  }

  async loginAsAdmin() {
    await this.login('admin', 'admin');
  }

  async loginAsUser(username: string) {
    await this.login(username, username);
  }

  async loginAsMariaCarter() {
    await this.login('mariacarter', 'mariacarter');
  }

  async loginAsBenCarter() {
    await this.login('bencarter', 'bencarter');
  }

  async loginAsSofiaRossi() {
    await this.login('sofiarossi', 'sofiarossi');
  }

  async loginAsLeoSchmidt() {
    await this.login('leoschmidt', 'leoschmidt');
  }

  async loginAsKenjiTanaka() {
    await this.login('kenjitanaka', 'kenjitanaka');
  }

  // Assertions
  async expectLoginFormVisible() {
    await this.expectVisibleByTestId('username-input');
    await this.expectVisibleByTestId('password-input');
    await this.expectVisibleByTestId('login-submit-button');
  }

  async expectErrorMessage(message: string) {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(message);
  }

  async expectToBeOnLoginPage() {
    await expect(this.page).toHaveURL(/.*\/login.*/);
    await this.expectLoginFormVisible();
  }

  async expectSubmitButtonDisabled() {
    await expect(this.submitButton).toBeDisabled();
  }

  async expectSubmitButtonEnabled() {
    await expect(this.submitButton).toBeEnabled();
  }

  // Validation
  async expectUsernameRequired() {
    await this.usernameInput.click();
    await this.passwordInput.click(); // Trigger validation
    await expect(this.page.locator('text=Username is required')).toBeVisible();
  }

  async expectPasswordRequired() {
    await this.passwordInput.click();
    await this.usernameInput.click(); // Trigger validation
    await expect(this.page.locator('text=Password is required')).toBeVisible();
  }

  // Utility methods
  async clearForm() {
    await this.usernameInput.clear();
    await this.passwordInput.clear();
  }

  async isLoggedIn() {
    // Check if we're redirected away from login page
    const currentUrl = this.getCurrentUrl();
    return !currentUrl.includes('/login');
  }
}
