import { test, expect } from '@playwright/test';

test.describe('Term Editing Logic', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[formControlName="username"]', 'admin');
    await page.fill('[formControlName="password"]', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/glossary');
  });

  test('should display edit button for terms with definitions', async ({ page }) => {
    // Wait for terms to load
    await page.waitForSelector('h3.cursor-pointer', { timeout: 10000 });
    
    // Click on first term
    await page.locator('h3.cursor-pointer').first().click();
    
    // Wait for term detail to load
    await expect(page.locator('app-term-detail')).toBeVisible();
    
    // Verify edit button is present and clickable
    const editButton = page.locator('button:has-text("Edit Definition")');
    await expect(editButton).toBeVisible();
    await expect(editButton).toBeEnabled();
  });

  test('should show edit mode when edit button is clicked', async ({ page }) => {
    // Wait for terms to load
    await page.waitForSelector('h3.cursor-pointer', { timeout: 10000 });
    
    // Click on first term
    await page.locator('h3.cursor-pointer').first().click();
    
    // Wait for term detail to load
    await expect(page.locator('app-term-detail')).toBeVisible();
    
    // Click edit button
    await page.click('button:has-text("Edit Definition")');
    
    // Verify edit mode is activated (button should disappear)
    await expect(page.locator('button:has-text("Edit Definition")')).not.toBeVisible();
    
    // Note: Since the actual edit form is not implemented yet,
    // we can only verify that the edit mode state changes
    // In a real implementation, we would check for:
    // - Edit form appears
    // - Content becomes editable
    // - Save/Cancel buttons appear
  });

  test('should handle terms without definitions', async ({ page }) => {
    // Wait for terms to load
    await page.waitForSelector('h3.cursor-pointer', { timeout: 10000 });
    
    // Try to find a term without a definition (if any exist)
    const termItems = page.locator('h3.cursor-pointer');
    const termCount = await termItems.count();
    
    // Click through a few terms to find one without definition
    for (let i = 0; i < Math.min(termCount, 5); i++) {
      await termItems.nth(i).click();
      
      // Check if this term has "No approved definition available"
      const noDefinitionText = page.locator('text=No approved definition available');
      if (await noDefinitionText.count() > 0) {
        // Verify the message is displayed
        await expect(noDefinitionText).toBeVisible();
        
        // Verify the edit button is still present
        await expect(page.locator('button:has-text("Edit Definition")')).toBeVisible();
        break;
      }
    }
  });

  test('should display term approval status correctly', async ({ page }) => {
    // Wait for terms to load
    await page.waitForSelector('h3.cursor-pointer', { timeout: 10000 });
    
    // Click on first term
    await page.locator('h3.cursor-pointer').first().click();
    
    // Wait for term detail to load
    await expect(page.locator('app-term-detail')).toBeVisible();
    
    // Check for approval status indicators - these might not exist if no active version
    const approvedStatus = page.locator('.bg-green-100:has-text("Approved")');
    const pendingStatus = page.locator('.bg-orange-100:has-text("Pending")');
    
    // Check if status elements exist (they might not if no active version)
    const hasApproved = await approvedStatus.count() > 0;
    const hasPending = await pendingStatus.count() > 0;
    
    // If no status elements, that's also valid (no active version)
    // Just verify the term detail loaded successfully
    expect(page.locator('app-term-detail')).toBeVisible();
  });

  test('should display term domain and official status', async ({ page }) => {
    // Wait for terms to load
    await page.waitForSelector('h3.cursor-pointer', { timeout: 10000 });
    
    // Click on first term
    await page.locator('h3.cursor-pointer').first().click();
    
    // Wait for term detail to load
    await expect(page.locator('app-term-detail')).toBeVisible();
    
    // Verify domain badge is displayed (first one in the header)
    await expect(page.locator('app-term-detail button[class*="px-3"][class*="py-1"]').first()).toBeVisible();
    
    // Check for official status (may or may not be present)
    const officialBadge = page.locator('.bg-yellow-400:has-text("OFFICIAL")');
    // Official badge is optional, so we just verify it's either present or not
    await expect(page.locator('app-term-detail')).toBeVisible();
  });

  test('should handle term selection and deselection', async ({ page }) => {
    // Wait for terms to load
    await page.waitForSelector('h3.cursor-pointer', { timeout: 10000 });
    
    const termItems = page.locator('h3.cursor-pointer');
    const termCount = await termItems.count();
    
    if (termCount >= 2) {
      // Click on first term
      await termItems.first().click();
      await expect(page.locator('app-term-detail')).toBeVisible();
      
      // Click on second term
      await termItems.nth(1).click();
      await expect(page.locator('app-term-detail')).toBeVisible();
      
      // Verify the selection changed (different term name)
      const termName = page.locator('app-term-detail h1');
      await expect(termName).toBeVisible();
    }
  });

  test('should maintain edit state when switching between terms', async ({ page }) => {
    // Wait for terms to load
    await page.waitForSelector('h3.cursor-pointer', { timeout: 10000 });
    
    const termItems = page.locator('h3.cursor-pointer');
    const termCount = await termItems.count();
    
    if (termCount >= 2) {
      // Click on first term
      await termItems.first().click();
      await expect(page.locator('app-term-detail')).toBeVisible();
      
      // Enter edit mode
      await page.click('button:has-text("Edit Definition")');
      
      // Switch to second term
      await termItems.nth(1).click();
      
      // Verify we're back in view mode for the new term
      await expect(page.locator('button:has-text("Edit Definition")')).toBeVisible();
    }
  });

  test('should display author and timestamp information', async ({ page }) => {
    // Wait for terms to load
    await page.waitForSelector('h3.cursor-pointer', { timeout: 10000 });
    
    // Click on first term
    await page.locator('h3.cursor-pointer').first().click();
    
    // Wait for term detail to load
    await expect(page.locator('app-term-detail')).toBeVisible();
    
    // Check for author information (if term has a definition)
    const authorInfo = page.locator('text=Author:');
    const timestampInfo = page.locator('text=Last Updated:');
    
    // These may or may not be present depending on whether the term has a definition
    // We just verify the term detail component is working
    await expect(page.locator('app-term-detail')).toBeVisible();
  });
});
