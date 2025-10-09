import { Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { TEST_USERS } from '../fixtures/testData';
import { join } from 'path';

export class AuthHelper {
  constructor(private page: Page) {}

  private get loginPage() {
    return new LoginPage(this.page);
  }

  /**
   * Get the path to auth state file for a user
   */
  private getAuthStatePath(user: keyof typeof TEST_USERS): string {
    return join(__dirname, '../.auth', `${user.toLowerCase()}.json`);
  }

  /**
   * Check if auth state file exists for a user
   */
  async hasAuthState(user: keyof typeof TEST_USERS): Promise<boolean> {
    try {
      const fs = await import('fs');
      const path = this.getAuthStatePath(user);
      return fs.existsSync(path);
    } catch {
      return false;
    }
  }

  /**
   * Load auth state for a user
   */
  async loadAuthState(user: keyof typeof TEST_USERS): Promise<void> {
    const authStatePath = this.getAuthStatePath(user);
    
    try {
      // Check if auth state file exists
      const fs = await import('fs');
      if (!fs.existsSync(authStatePath)) {
        console.log(`⚠️  Auth state file not found for ${user}, performing login...`);
        await this.loginAs(user);
        return;
      }
      
      await this.page.context().addInitScript(() => {
        // This will be executed before the page loads
      });
      
      // Load the storage state
      await this.page.context().storageState({ path: authStatePath });
    } catch (error) {
      console.warn(`Failed to load auth state for ${user}:`, error);
      // Fallback to regular login
      await this.loginAs(user);
    }
  }

  /**
   * Setup auth state for all test users (called in global setup)
   */
  async setupAuthStates(): Promise<void> {
    const users = Object.keys(TEST_USERS) as (keyof typeof TEST_USERS)[];
    
    for (const user of users) {
      try {
        await this.loginAs(user);
        await this.waitForLoginComplete();
        
        // Save storage state
        const authStatePath = this.getAuthStatePath(user);
        await this.page.context().storageState({ path: authStatePath });
        
        console.log(`✅ Auth state saved for ${user}`);
        
        // Clear storage for next user
        await this.page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });
        
      } catch (error) {
        console.error(`❌ Failed to setup auth state for ${user}:`, error);
        throw error;
      }
    }
  }

  /**
   * Login as a specific user
   */
  async loginAs(user: keyof typeof TEST_USERS) {
    const userData = TEST_USERS[user];
    await this.loginPage.goto();
    await this.loginPage.login(userData.username, userData.password);
    return this.loginPage;
  }

  /**
   * Login as admin user
   */
  async loginAsAdmin() {
    return await this.loginAs('ADMIN');
  }

  /**
   * Login as Maria Carter (Physics, Chemistry domains)
   */
  async loginAsMariaCarter() {
    return await this.loginAs('MARIA_CARTER');
  }

  /**
   * Login as Ben Carter (Chemistry, Biology domains)
   */
  async loginAsBenCarter() {
    return await this.loginAs('BEN_CARTER');
  }

  /**
   * Login as Sofia Rossi (Computer Science, Graph Theory domains)
   */
  async loginAsSofiaRossi() {
    return await this.loginAs('SOFIA_ROSSI');
  }

  /**
   * Login as Leo Schmidt (Biology, Geology domains)
   */
  async loginAsLeoSchmidt() {
    return await this.loginAs('LEO_SCHMIDT');
  }

  /**
   * Login as Kenji Tanaka (Physics, Geology domains)
   */
  async loginAsKenjiTanaka() {
    return await this.loginAs('KENJI_TANAKA');
  }

  /**
   * Login with custom credentials
   */
  async loginWithCredentials(username: string, password: string) {
    await this.loginPage.goto();
    await this.loginPage.login(username, password);
    return this.loginPage;
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn() {
    const currentUrl = this.page.url();
    // Check if we're not on login page and not redirected to login
    return !currentUrl.includes('/login') && currentUrl !== 'about:blank';
  }

  /**
   * Logout by clearing session storage and navigating to login
   */
  async logout() {
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await this.page.goto('/login');
  }

  /**
   * Ensure user is logged in before proceeding
   */
  async ensureLoggedIn(user: keyof typeof TEST_USERS = 'ADMIN') {
    if (!(await this.isLoggedIn())) {
      await this.loginAs(user);
    }
  }

  /**
   * Get current user info from the page
   */
  async getCurrentUser() {
    // This would need to be implemented based on how user info is stored/displayed
    // For now, return null as a placeholder
    return null;
  }

  /**
   * Check if current user has admin privileges
   */
  async isAdmin() {
    // This would need to be implemented based on how admin status is determined
    // For now, return false as a placeholder
    return false;
  }

  /**
   * Check if current user can approve in specific domain
   */
  async canApproveInDomain(domain: string) {
    // This would need to be implemented based on user permissions
    // For now, return true as a placeholder
    return true;
  }

  /**
   * Check if current user can endorse
   */
  async canEndorse() {
    // This would need to be implemented based on user permissions
    // For now, return true as a placeholder
    return true;
  }

  /**
   * Wait for login to complete
   */
  async waitForLoginComplete() {
    await this.page.waitForURL(url => !url.includes('/login'));
  }

  /**
   * Handle login errors
   */
  async handleLoginError() {
    const errorMessage = await this.loginPage.errorMessage.textContent();
    throw new Error(`Login failed: ${errorMessage}`);
  }

  /**
   * Setup test user session
   */
  async setupTestSession(user: keyof typeof TEST_USERS) {
    await this.logout();
    await this.loginAs(user);
    await this.waitForLoginComplete();
  }

  /**
   * Cleanup test session
   */
  async cleanupTestSession() {
    await this.logout();
  }

  /**
   * Get user domains for testing
   */
  getUserDomains(user: keyof typeof TEST_USERS): string[] {
    const userData = TEST_USERS[user];
    return userData.domains || [];
  }

  /**
   * Check if user has access to specific domain
   */
  hasDomainAccess(user: keyof typeof TEST_USERS, domain: string): boolean {
    const userDomains = this.getUserDomains(user);
    return userDomains.includes(domain);
  }

  /**
   * Get all available test users
   */
  getAvailableUsers(): (keyof typeof TEST_USERS)[] {
    return Object.keys(TEST_USERS) as (keyof typeof TEST_USERS)[];
  }

  /**
   * Get users with specific domain access
   */
  getUsersWithDomainAccess(domain: string): (keyof typeof TEST_USERS)[] {
    return this.getAvailableUsers().filter(user => 
      this.hasDomainAccess(user, domain)
    );
  }

  /**
   * Get users who can approve each other's definitions
   */
  getApprovalPairs(): Array<{ approver: keyof typeof TEST_USERS; author: keyof typeof TEST_USERS }> {
    const pairs: Array<{ approver: keyof typeof TEST_USERS; author: keyof typeof TEST_USERS }> = [];
    const users = this.getAvailableUsers();
    
    for (const approver of users) {
      for (const author of users) {
        if (approver !== author) {
          // Check if they share any domains
          const approverDomains = this.getUserDomains(approver);
          const authorDomains = this.getUserDomains(author);
          const sharedDomains = approverDomains.filter(domain => authorDomains.includes(domain));
          
          if (sharedDomains.length > 0) {
            pairs.push({ approver, author });
          }
        }
      }
    }
    
    return pairs;
  }
}
