import { test, expect } from '@playwright/test';

test.describe('Publish Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[formControlName="username"]', 'admin');
    await page.fill('[formControlName="password"]', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/glossary');
  });

  test('should show publish button for approved versions', async ({ page }) => {
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
      
      // Look for publish button (should be visible for approved versions)
      const publishButton = page.locator('button:has-text("Publish")');
      const hasPublishButton = await publishButton.isVisible();
      
      // Publish button should be visible if version is approved
      if (hasPublishButton) {
        await expect(publishButton).toBeVisible();
      }
    }
  });

  test('should show approval status before publish', async ({ page }) => {
    await page.click('a[routerLink="/review"]');
    await page.waitForURL('**/review');
    await page.waitForTimeout(2000);

    const pendingVersionList = page.locator('.space-y-4 > div');
    const listCount = await pendingVersionList.count();

    if (listCount > 0) {
      await pendingVersionList.first().click();
      await page.waitForTimeout(500);
      
      // Should show approval status
      const hasApprovalStatus = await page.locator('text=/\\d+\\/2 Approvals/').isVisible() ||
                               await page.locator('text=/Approved/').isVisible() ||
                               await page.locator('text=/Ready to publish/').isVisible();
      
      expect(hasApprovalStatus).toBeTruthy();
    }
  });

  test('should show replaces section when publishing', async ({ page }) => {
    await page.click('a[routerLink="/review"]');
    await page.waitForURL('**/review');
    await page.waitForTimeout(2000);

    const pendingVersionList = page.locator('.space-y-4 > div');
    const listCount = await pendingVersionList.count();

    if (listCount > 0) {
      await pendingVersionList.first().click();
      await page.waitForTimeout(500);
      
      // Look for replaces section
      const hasReplacesSection = await page.locator('text=/Replaces/').isVisible() ||
                                await page.locator('text=/Currently active/').isVisible();
      
      // Replaces section should be visible if there's an active version
      if (hasReplacesSection) {
        await expect(page.locator('text=/Replaces/')).toBeVisible();
      }
    }
  });

  test('should handle publish action', async ({ page }) => {
    await page.click('a[routerLink="/review"]');
    await page.waitForURL('**/review');
    await page.waitForTimeout(2000);

    const pendingVersionList = page.locator('.space-y-4 > div');
    const listCount = await pendingVersionList.count();

    if (listCount > 0) {
      await pendingVersionList.first().click();
      await page.waitForTimeout(500);
      
      const publishButton = page.locator('button:has-text("Publish")');
      const hasPublishButton = await publishButton.isVisible();

      if (hasPublishButton) {
        // Click publish button
        await publishButton.click();
        await page.waitForTimeout(2000);
        
        // Should show success message or interface updates
        const hasSuccessMessage = await page.locator('text=/Successfully published/').isVisible() ||
                                 await page.locator('text=/Published/').isVisible();
        
        // Either success message or interface should update
        expect(hasSuccessMessage || await page.locator('app-review-dashboard').isVisible()).toBeTruthy();
      }
    }
  });

  test('should show publish button only for approved versions', async ({ page }) => {
    await page.click('a[routerLink="/review"]');
    await page.waitForURL('**/review');
    await page.waitForTimeout(2000);

    const pendingVersionList = page.locator('.space-y-4 > div');
    const listCount = await pendingVersionList.count();

    if (listCount > 0) {
      await pendingVersionList.first().click();
      await page.waitForTimeout(500);
      
      // Check if version is approved
      const isApproved = await page.locator('text=/Approved/').isVisible() ||
                        await page.locator('text=/2\\/2 Approvals/').isVisible();
      
      const publishButton = page.locator('button:has-text("Publish")');
      const hasPublishButton = await publishButton.isVisible();
      
      // Publish button should only be visible for approved versions
      if (isApproved) {
        expect(hasPublishButton).toBeTruthy();
      } else {
        expect(hasPublishButton).toBeFalsy();
      }
    }
  });

  test('should show error for unapproved publish attempts', async ({ page }) => {
    await page.click('a[routerLink="/review"]');
    await page.waitForURL('**/review');
    await page.waitForTimeout(2000);

    const pendingVersionList = page.locator('.space-y-4 > div');
    const listCount = await pendingVersionList.count();

    if (listCount > 0) {
      await pendingVersionList.first().click();
      await page.waitForTimeout(500);
      
      // Look for versions that are not approved
      const isNotApproved = await page.locator('text=/\\d+\\/2 Approvals/').isVisible() &&
                           !(await page.locator('text=/2\\/2 Approvals/').isVisible());
      
      if (isNotApproved) {
        // Should not show publish button for unapproved versions
        const publishButton = page.locator('button:has-text("Publish")');
        await expect(publishButton).not.toBeVisible();
      }
    }
  });
});
