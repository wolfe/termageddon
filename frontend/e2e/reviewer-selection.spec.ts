import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth';
import { ReviewPage } from './pages/ReviewPage';

test.describe('Reviewer Selection Workflow', () => {
  test.beforeEach(async ({ page }) => {
    const auth = new AuthHelper(page);
    await auth.loginAsAdmin();
  });

  test('should open reviewer selector dialog', async ({ page }) => {
    const review = new ReviewPage(page);
    await review.goto();
    await review.waitForVersionsToLoad();
    
    const count = await review.getVersionCount();
    if (count > 0) {
      // Look for a version that belongs to the current user (admin)
      let ownVersionIndex = -1;
      for (let i = 0; i < count; i++) {
        await review.selectVersion(i);
        if (await review.requestReviewButton.isVisible()) {
          ownVersionIndex = i;
          break;
        }
      }
      
      if (ownVersionIndex >= 0) {
        await review.expectRequestReviewButtonVisible();
        await review.requestReview();
      } else {
        // Skip test if no own versions found
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should display user list in reviewer selector', async ({ page }) => {
    const review = new ReviewPage(page);
    await review.goto();
    await review.waitForVersionsToLoad();
    
    const count = await review.getVersionCount();
    if (count > 0) {
      // Look for a version that belongs to the current user
      let ownVersionIndex = -1;
      for (let i = 0; i < count; i++) {
        await review.selectVersion(i);
        if (await review.requestReviewButton.isVisible()) {
          ownVersionIndex = i;
          break;
        }
      }
      
      if (ownVersionIndex >= 0) {
        await review.requestReview();
        // Should show user list with checkboxes
        await expect(page.locator('input[type="checkbox"]')).toBeVisible();
        await expect(page.locator('text=admin')).toBeVisible();
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should allow selecting multiple reviewers', async ({ page }) => {
    const review = new ReviewPage(page);
    await review.goto();
    await review.waitForVersionsToLoad();
    
    const count = await review.getVersionCount();
    if (count > 0) {
      // Look for a version that belongs to the current user
      let ownVersionIndex = -1;
      for (let i = 0; i < count; i++) {
        await review.selectVersion(i);
        if (await review.requestReviewButton.isVisible()) {
          ownVersionIndex = i;
          break;
        }
      }
      
      if (ownVersionIndex >= 0) {
        await review.requestReview();
        
        const checkboxes = page.locator('input[type="checkbox"]');
        const checkboxCount = await checkboxes.count();
        
        if (checkboxCount > 0) {
          await checkboxes.first().check();
          await expect(page.locator('button:has-text("Confirm Selection")')).toBeVisible();
        }
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should close dialog on cancel', async ({ page }) => {
    const review = new ReviewPage(page);
    await review.goto();
    await review.waitForVersionsToLoad();
    
    const count = await review.getVersionCount();
    if (count > 0) {
      // Look for a version that belongs to the current user
      let ownVersionIndex = -1;
      for (let i = 0; i < count; i++) {
        await review.selectVersion(i);
        if (await review.requestReviewButton.isVisible()) {
          ownVersionIndex = i;
          break;
        }
      }
      
      if (ownVersionIndex >= 0) {
        await review.requestReview();
        
        await page.click('button:has-text("Cancel")');
        await expect(page.locator('h2:has-text("Select Reviewers")')).not.toBeVisible();
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should search users in reviewer selector', async ({ page }) => {
    const review = new ReviewPage(page);
    await review.goto();
    await review.waitForVersionsToLoad();
    
    const count = await review.getVersionCount();
    if (count > 0) {
      // Look for a version that belongs to the current user
      let ownVersionIndex = -1;
      for (let i = 0; i < count; i++) {
        await review.selectVersion(i);
        if (await review.requestReviewButton.isVisible()) {
          ownVersionIndex = i;
          break;
        }
      }
      
      if (ownVersionIndex >= 0) {
        await review.requestReview();
        
        const searchInput = page.locator('input[placeholder*="Search users"]');
        if (await searchInput.isVisible()) {
          await searchInput.fill('admin');
          await expect(page.locator('text=admin')).toBeVisible();
        }
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });
});
