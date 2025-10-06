import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login successfully with admin credentials', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Verify login page elements
    await expect(page.locator('h1')).toContainText('Termageddon');
    await expect(page.locator('input[formControlName="username"]')).toBeVisible();
    await expect(page.locator('input[formControlName="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Fill login form
    await page.fill('[formControlName="username"]', 'admin');
    await page.fill('[formControlName="password"]', 'admin');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for redirect to glossary
    await page.waitForURL('**/glossary');
    
    // Verify we're on the glossary page
    await expect(page.locator('app-glossary-view')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill with invalid credentials
    await page.fill('[formControlName="username"]', 'invalid');
    await page.fill('[formControlName="password"]', 'invalid');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for error message
    await expect(page.locator('.bg-orange-100')).toBeVisible();
    await expect(page.locator('.text-orange-700')).toContainText('Invalid username or password');
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    // Try to access glossary without login
    await page.goto('/glossary');
    
    // Should redirect to login - wait for either URL change or login page elements
    await Promise.race([
      page.waitForURL('**/login', { timeout: 15000 }),
      page.waitForSelector('[formControlName="username"]', { timeout: 15000 })
    ]);
    
    // Verify we're on login page
    await expect(page.locator('h1')).toContainText('Termageddon');
    await expect(page.locator('[formControlName="username"]')).toBeVisible();
  });
});
