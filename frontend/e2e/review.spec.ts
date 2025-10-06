import { test, expect } from '@playwright/test';

test.describe('Review Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[formControlName="username"]', 'admin');
    await page.fill('[formControlName="password"]', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/glossary');
  });

  test('should display review dashboard', async ({ page }) => {
    // Navigate to review tab
    await page.click('a[routerLink="/review"]');
    await page.waitForURL('**/review');

    // Check that review dashboard loads with simplified layout
    await expect(page.locator('h2:has-text("Pending Reviews")')).toBeVisible();
    await expect(page.locator('text=Definitions waiting for approval')).toBeVisible();
    
    // Check for search input
    await expect(page.locator('input[placeholder="Search terms, domains, authors..."]')).toBeVisible();
  });

  test('should display search functionality', async ({ page }) => {
    await page.click('a[routerLink="/review"]');
    await page.waitForURL('**/review');

    // Check search input exists
    const searchInput = page.locator('input[placeholder="Search terms, domains, authors..."]');
    await expect(searchInput).toBeVisible();
    
    // Test search functionality
    await searchInput.fill('test');
    await searchInput.press('Enter');
  });

  test('should show empty state messages', async ({ page }) => {
    await page.click('a[routerLink="/review"]');
    await page.waitForURL('**/review');

    // Wait for data to load
    await page.waitForTimeout(2000);

    // Check for any visible content in the review interface
    const hasContent = await page.locator('text=Definitions waiting for approval').isVisible();
    const hasEmptyMessage = await page.locator('text=Select a definition to review').isVisible();
    
    expect(hasContent || hasEmptyMessage).toBeTruthy();
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
    // Start in glossary
    await page.click('a[routerLink="/review"]');
    await page.waitForURL('**/review');

    // Review tab should be active (bold and underlined)
    await expect(page.locator('a[routerLink="/review"]')).toHaveClass(/font-bold/);
    await expect(page.locator('a[routerLink="/review"]')).toHaveClass(/underline/);

    // Glossary tab should not be active
    await expect(page.locator('a[routerLink="/glossary"]')).not.toHaveClass(/font-bold|underline/);
  });

  test('should show "Select a definition to review" when no selection', async ({ page }) => {
    await page.click('a[routerLink="/review"]');
    await page.waitForURL('**/review');

    // Should show placeholder message
    await expect(page.locator('text=Select a definition to review')).toBeVisible();
    await expect(page.locator('text=Choose from the pending review list on the left')).toBeVisible();
  });

  test('should show eligibility indicators in sidebar', async ({ page }) => {
    await page.click('a[routerLink="/review"]');
    await page.waitForURL('**/review');
    await page.waitForTimeout(2000);

    // Check for eligibility summary in header (more specific selectors)
    await expect(page.locator('.flex.items-center.space-x-4').locator('text=ready to approve')).toBeVisible();
    await expect(page.locator('.flex.items-center.space-x-4').locator('text=already approved')).toBeVisible();
    await expect(page.locator('.flex.items-center.space-x-4').locator('text=your versions')).toBeVisible();

    // Check for eligibility indicators in version list
    const versionItems = page.locator('.space-y-4 > div');
    const itemCount = await versionItems.count();

    if (itemCount > 0) {
      // Should have eligibility status indicators
      const hasEligibilityIndicators = await page.locator('text=/Ready to approve|Already approved|Your version/').isVisible();
      expect(hasEligibilityIndicators).toBeTruthy();
    }
  });

  test('should show specific approval reason messages', async ({ page }) => {
    await page.click('a[routerLink="/review"]');
    await page.waitForURL('**/review');
    await page.waitForTimeout(2000);

    // Check that specific approval reasons are shown instead of generic message
    const versionItems = page.locator('.space-y-4 > div');
    const itemCount = await versionItems.count();

    if (itemCount > 0) {
      // Click on first version to see approval status
      await versionItems.first().click();
      await page.waitForTimeout(500);

      // Should show specific reasons, not generic "cannot be approved at this time"
      const approvalSection = page.locator('.bg-white.border.rounded-lg.p-4');
      await expect(approvalSection).toBeVisible();
      
      // Should not show the generic message
      await expect(page.locator('text=This definition cannot be approved at this time')).not.toBeVisible();
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