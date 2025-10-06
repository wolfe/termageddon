import { test, expect } from '@playwright/test';

test.describe('Authentication Protection', () => {
  test('should redirect to login when accessing protected routes without authentication', async ({ page }) => {
    // Try to access protected route without logging in
    await page.goto('/glossary');
    
    // Wait a bit for any redirects
    await page.waitForTimeout(1000);
    
    // Should redirect to login page
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('h1')).toContainText('Termageddon');
  });

  test('should redirect to login when accessing review route without authentication', async ({ page }) => {
    // Try to access review route without logging in
    await page.goto('/review');
    
    // Wait a bit for any redirects
    await page.waitForTimeout(1000);
    
    // Should redirect to login page
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('h1')).toContainText('Termageddon');
  });

  test('should redirect to login when accessing root without authentication', async ({ page }) => {
    // Try to access root without logging in
    await page.goto('/');
    
    // Wait a bit for any redirects
    await page.waitForTimeout(1000);
    
    // Should redirect to login page
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('h1')).toContainText('Termageddon');
  });

  test('should redirect to login when accessing invalid route without authentication', async ({ page }) => {
    // Try to access invalid route without logging in
    await page.goto('/invalid-route');
    
    // Wait a bit for any redirects
    await page.waitForTimeout(1000);
    
    // Should redirect to login page
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('h1')).toContainText('Termageddon');
  });

  test('should redirect authenticated user away from login page', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Give extra time for component to load
    
    // Clear any existing auth state after page loads
    await page.evaluate(() => {
      localStorage.removeItem('auth_token');
    });
    
    await page.waitForSelector('[formControlName="username"]', { timeout: 10000 });
    await page.fill('[formControlName="username"]', 'admin');
    await page.fill('[formControlName="password"]', 'admin');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to glossary
    await expect(page).toHaveURL(/.*glossary/);
    
    // Try to access login page again
    await page.goto('/login');
    
    // Should redirect back to glossary
    await expect(page).toHaveURL(/.*glossary/);
  });

  test('should handle session timeout gracefully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Give extra time for component to load
    
    // Clear any existing auth state after page loads
    await page.evaluate(() => {
      localStorage.removeItem('auth_token');
    });
    
    await page.waitForSelector('[formControlName="username"]', { timeout: 10000 });
    await page.fill('[formControlName="username"]', 'admin');
    await page.fill('[formControlName="password"]', 'admin');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to glossary
    await expect(page).toHaveURL(/.*glossary/);
    
    // Clear the auth token to simulate session timeout
    await page.evaluate(() => {
      localStorage.removeItem('auth_token');
    });
    
    // Try to navigate to a protected route
    await page.goto('/review');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
  });

  test('should preserve return URL when redirected to login', async ({ page }) => {
    // Try to access a specific protected route
    await page.goto('/review');
    
    // Should redirect to login with return URL
    await expect(page).toHaveURL(/.*login.*returnUrl/);
    
    // Login
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Give extra time for component to load
    
    // Clear any existing auth state after page loads
    await page.evaluate(() => {
      localStorage.removeItem('auth_token');
    });
    
    await page.waitForSelector('[formControlName="username"]', { timeout: 10000 });
    await page.fill('[formControlName="username"]', 'admin');
    await page.fill('[formControlName="password"]', 'admin');
    await page.click('button[type="submit"]');
    
    // Should redirect back to the original route
    await expect(page).toHaveURL(/.*review/);
  });
});
