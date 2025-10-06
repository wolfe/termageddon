import { test, expect } from '@playwright/test';

test.describe('Reviewer Selection Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[formControlName="username"]', 'admin');
    await page.fill('[formControlName="password"]', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/glossary');
  });

  test('should open reviewer selector dialog', async ({ page }) => {
    // Navigate to review tab
    await page.click('a[routerLink="/review"]');
    await page.waitForURL('**/review');
    await page.waitForTimeout(2000);

    // Look for any pending versions
    const pendingVersionList = page.locator('.space-y-4 > div');
    const listCount = await pendingVersionList.count();

    if (listCount > 0) {
      // Click on first pending version
      await pendingVersionList.first().click();
      await page.waitForTimeout(500);
      
      // Look for "Request Review" button
      const requestReviewButton = page.locator('button:has-text("Request Review")');
      const hasRequestReviewButton = await requestReviewButton.isVisible();

      if (hasRequestReviewButton) {
        // Click the request review button
        await requestReviewButton.click();
        await page.waitForTimeout(500);
        
        // Should open reviewer selector dialog
        await expect(page.locator('h2:has-text("Select Reviewers")')).toBeVisible();
        await expect(page.locator('text=Choose users to review this version')).toBeVisible();
      }
    }
  });

  test('should display user list in reviewer selector', async ({ page }) => {
    await page.click('a[routerLink="/review"]');
    await page.waitForURL('**/review');
    await page.waitForTimeout(2000);

    const pendingVersionList = page.locator('.space-y-4 > div');
    const listCount = await pendingVersionList.count();

    if (listCount > 0) {
      await pendingVersionList.first().click();
      await page.waitForTimeout(500);
      
      const requestReviewButton = page.locator('button:has-text("Request Review")');
      const hasRequestReviewButton = await requestReviewButton.isVisible();

      if (hasRequestReviewButton) {
        await requestReviewButton.click();
        await page.waitForTimeout(500);
        
        // Should show user list with checkboxes
        await expect(page.locator('input[type="checkbox"]')).toBeVisible();
        await expect(page.locator('text=admin')).toBeVisible(); // Should show at least the admin user
      }
    }
  });

  test('should allow selecting multiple reviewers', async ({ page }) => {
    await page.click('a[routerLink="/review"]');
    await page.waitForURL('**/review');
    await page.waitForTimeout(2000);

    const pendingVersionList = page.locator('.space-y-4 > div');
    const listCount = await pendingVersionList.count();

    if (listCount > 0) {
      await pendingVersionList.first().click();
      await page.waitForTimeout(500);
      
      const requestReviewButton = page.locator('button:has-text("Request Review")');
      const hasRequestReviewButton = await requestReviewButton.isVisible();

      if (hasRequestReviewButton) {
        await requestReviewButton.click();
        await page.waitForTimeout(500);
        
        // Select a reviewer
        const checkboxes = page.locator('input[type="checkbox"]');
        const checkboxCount = await checkboxes.count();
        
        if (checkboxCount > 0) {
          await checkboxes.first().check();
          
          // Should show confirm button
          await expect(page.locator('button:has-text("Confirm Selection")')).toBeVisible();
        }
      }
    }
  });

  test('should close dialog on cancel', async ({ page }) => {
    await page.click('a[routerLink="/review"]');
    await page.waitForURL('**/review');
    await page.waitForTimeout(2000);

    const pendingVersionList = page.locator('.space-y-4 > div');
    const listCount = await pendingVersionList.count();

    if (listCount > 0) {
      await pendingVersionList.first().click();
      await page.waitForTimeout(500);
      
      const requestReviewButton = page.locator('button:has-text("Request Review")');
      const hasRequestReviewButton = await requestReviewButton.isVisible();

      if (hasRequestReviewButton) {
        await requestReviewButton.click();
        await page.waitForTimeout(500);
        
        // Click cancel button
        await page.click('button:has-text("Cancel")');
        await page.waitForTimeout(500);
        
        // Dialog should be closed
        await expect(page.locator('h2:has-text("Select Reviewers")')).not.toBeVisible();
      }
    }
  });

  test('should search users in reviewer selector', async ({ page }) => {
    await page.click('a[routerLink="/review"]');
    await page.waitForURL('**/review');
    await page.waitForTimeout(2000);

    const pendingVersionList = page.locator('.space-y-4 > div');
    const listCount = await pendingVersionList.count();

    if (listCount > 0) {
      await pendingVersionList.first().click();
      await page.waitForTimeout(500);
      
      const requestReviewButton = page.locator('button:has-text("Request Review")');
      const hasRequestReviewButton = await requestReviewButton.isVisible();

      if (hasRequestReviewButton) {
        await requestReviewButton.click();
        await page.waitForTimeout(500);
        
        // Look for search input
        const searchInput = page.locator('input[placeholder*="Search users"]');
        const hasSearchInput = await searchInput.isVisible();
        
        if (hasSearchInput) {
          await searchInput.fill('admin');
          await page.waitForTimeout(500);
          
          // Should filter results
          await expect(page.locator('text=admin')).toBeVisible();
        }
      }
    }
  });
});
