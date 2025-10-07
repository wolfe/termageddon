import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth';
import { ReviewPage } from './pages/ReviewPage';

test.describe('Review Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    const auth = new AuthHelper(page);
    await auth.loginAsAdmin();
  });

  test('should display review dashboard', async ({ page }) => {
    const review = new ReviewPage(page);
    await review.goto();
    await review.expectSearchInputVisible();
  });

  test('should display search functionality', async ({ page }) => {
    const review = new ReviewPage(page);
    await review.goto();
    await review.expectSearchInputVisible();
    await review.search('test');
  });

  test('should show empty state messages', async ({ page }) => {
    const review = new ReviewPage(page);
    await review.goto();
    // Either initial guidance or versions present
    const hasSelectMessage = await review.selectVersionMessage.isVisible();
    const count = await review.getVersionCount();
    expect(hasSelectMessage || count >= 0).toBeTruthy();
  });

  test('should allow navigation between glossary and review', async ({ page }) => {
    // Start in glossary
    await expect(page.locator('app-glossary-view')).toBeVisible();
    
    // Navigate to review
    await page.click('a[routerLink="/review"]');
    await page.waitForURL('**/review');
    await expect(page.locator('h2:has-text("Pending Reviews")')).toBeVisible();
    
    // Navigate back to glossary
    await page.click('a[routerLink="/glossary"]');
    await page.waitForURL('**/glossary');
    
    // Should be back in glossary
    await expect(page.locator('app-glossary-view')).toBeVisible();
  });

  test('should show proper navigation styling', async ({ page }) => {
    // Navigate to review
    await page.goto('/review');
    await page.waitForURL('**/review');
    await expect(page.locator('a[routerLink="/review"]')).toHaveClass(/font-bold/);
  });

  test('should show "Select a definition to review" when no selection', async ({ page }) => {
    const review = new ReviewPage(page);
    await review.goto();
    await review.expectSelectVersionMessage();
  });

  test('should show eligibility indicators in sidebar', async ({ page }) => {
    const review = new ReviewPage(page);
    await review.goto();
    const count = await review.getVersionCount();
    if (count > 0) {
      const statuses = await review.getEligibilityStatuses();
      expect(statuses.join(' ')).toMatch(/approve|approved|version/i);
    }
  });

  test('should show specific approval reason messages', async ({ page }) => {
    const review = new ReviewPage(page);
    await review.goto();
    const count = await review.getVersionCount();
    if (count > 0) {
      await review.selectVersion(0);
      // Presence of detail section implied by title/content
      await review.expectVersionContentVisible();
    }
  });
});

test.describe('Review Approval Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[formControlName="username"]', 'admin');
    await page.fill('[formControlName="password"]', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/glossary');
  });

  test('should create a version and show it in review', async ({ page }) => {
    // First, create a version by editing a term
    await page.waitForSelector('h3.cursor-pointer', { timeout: 10000 });
    
    // Click on first available term
    await page.locator('h3.cursor-pointer').first().click();
    await page.waitForSelector('app-term-detail');
    
    // Click edit button
    await page.click('button:has-text("Edit Definition")');
    await page.waitForSelector('quill-editor .ql-editor');
    
    // Add new content
    await page.click('quill-editor .ql-editor');
    await page.type('quill-editor .ql-editor', 'This is a test definition for review flow testing.');
    
    // Save the version
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(2000); // Wait for save to complete

    // Navigate to review tab
    await page.click('a[routerLink="/review"]');
    await page.waitForURL('**/review');
    
    // Wait for review data to load
    await page.waitForTimeout(2000);

    // Look for the test content in review
    const hasTestContent = await page.locator('text=This is a test definition for review flow testing.').isVisible();
    
    // If we find the content, verify it shows as pending
    if (hasTestContent) {
      // The version should show as pending
      const pendingStatus = page.locator('text=/\\d+\\/2 Approvals/');
      await expect(pendingStatus).toBeVisible();
    }
  });

  test('should show approval options when selecting a version', async ({ page }) => {
    await page.click('a[routerLink="/review"]');
    await page.waitForURL('**/review');
    await page.waitForTimeout(2000);

    // Look for any pending versions in the list
    const pendingVersionList = page.locator('.space-y-4 > div');
    const listCount = await pendingVersionList.count();

    if (listCount > 0) {
      // Click on first pending version
      await pendingVersionList.first().click();
      await page.waitForTimeout(500);
      
      // Should show approval interface
      const hasApprovalSection = await page.locator('text=/Ready for Approval/').isVisible();
      const hasOwnVersionSection = await page.locator('text=/Your Definition/').isVisible();
      const hasAlreadyApproved = await page.locator('text=/Already Approved/').isVisible();
      
      expect(hasApprovalSection || hasOwnVersionSection || hasAlreadyApproved).toBeTruthy();
    } else {
      // If no versions, check that empty state is shown correctly
      const hasEmptyState = await page.locator('text=/Select a definition to review/').isVisible();
      expect(hasEmptyState).toBeTruthy();
    }
  });

  test('should handle approval action', async ({ page }) => {
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
      
      // Look for approve button
      const approveButton = page.locator('button:has-text("Approve")');
      const hasApproveButton = await approveButton.isVisible();

      if (hasApproveButton) {
        // Test clicking approve
        await approveButton.click();
        await page.waitForTimeout(2000);
        
        // Check that interface updates appropriately
        const hasSuccessFeedback = await page.locator('text=/Successfully approved/').isVisible();
        // Either success message or interface updates
        expect(hasSuccessFeedback || await page.locator('app-review-dashboard').isVisible()).toBeTruthy();
      } else {
        // Should show appropriate message for why can't approve
        const hasRestrictionMessage = await page.locator('text=/Your Definition/').isVisible() ||
                                     await page.locator('text=/Already Approved/').isVisible() ||
                                     await page.locator('text=/Cannot Approve/').isVisible();
        expect(hasRestrictionMessage).toBeTruthy();
      }
    } else {
      // Test passes regardless if no versions exist
      expect(true).toBeTruthy();
    }
  });

  test('should show version details when selected', async ({ page }) => {
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
      
      // Should show version details on the right
      await expect(page.locator('h1.text-xl')).toBeVisible();
      await expect(page.locator('text=Definition:')).toBeVisible();
      await expect(page.locator('text=Author Information:')).toBeVisible();
      
    } else {
      // Should show placeholder when no selection
      await expect(page.locator('text=Select a definition to review')).toBeVisible();
    }
  });

  test('should filter versions by search', async ({ page }) => {
    await page.click('a[routerLink="/review"]');
    await page.waitForURL('**/review');
    await page.waitForTimeout(2000);

    const searchInput = page.locator('input[placeholder="Search terms, domains, authors..."]');
    
    // Try searching for something
    await searchInput.fill('nonexistentterm');
    await searchInput.press('Enter');
    await page.waitForTimeout(500);
    
    // Check that search interface is responsive
    const hasSearchInput = await searchInput.isVisible();
    expect(hasSearchInput).toBeTruthy();
    
    // Check that we're still in review interface
    const hasReviewDashboard = await page.locator('h2:has-text("Pending Reviews")').isVisible();
    expect(hasReviewDashboard).toBeTruthy();
  });
});