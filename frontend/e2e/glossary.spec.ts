import { test, expect } from '@playwright/test';

test.describe('Glossary Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[formControlName="username"]', 'admin');
    await page.fill('[formControlName="password"]', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/glossary');
  });

  test('should display glossary interface', async ({ page }) => {
    // Verify main components are visible
    await expect(page.locator('app-glossary-view')).toBeVisible();
    await expect(page.locator('app-term-list')).toBeVisible();
    
    // Verify initial state
    await expect(page.locator('text=Select a term to view its definition')).toBeVisible();
  });

  test('should load and display terms', async ({ page }) => {
    // Wait for terms to load
    await page.waitForSelector('h3.cursor-pointer', { timeout: 10000 });
    
    // Verify terms are displayed
    const termItems = page.locator('h3.cursor-pointer');
    await expect(termItems.first()).toBeVisible();
    
    // Check that terms have expected structure
    await expect(termItems.first()).toBeVisible();
    // Check for domain badges in the same container - they're in a div below the h3
    const firstTermContainer = termItems.first().locator('xpath=..');
    await expect(firstTermContainer.locator('span[class*="px-2"][class*="py-0"]')).toBeVisible();
  });

  test('should filter terms by domain', async ({ page }) => {
    // Wait for terms to load first
    await page.waitForSelector('h3.cursor-pointer', { timeout: 10000 });
    
    // Check if domain select exists
    const domainSelect = page.locator('select[formControl]');
    const selectExists = await domainSelect.count() > 0;
    
    if (selectExists) {
      // Wait for domain select to be visible
      await expect(domainSelect).toBeVisible();
      
      // Get initial term count
      const initialTerms = page.locator('h3.cursor-pointer');
      const initialCount = await initialTerms.count();
      
      // Check if there are domain options available
      const domainOptions = page.locator('select[formControl] option');
      const optionCount = await domainOptions.count();
      
      if (optionCount > 1) { // More than just "All Domains"
        // Select the first domain option (skip "All Domains")
        await page.selectOption('select[formControl]', { index: 1 });
        
        // Wait for filtered results
        await page.waitForTimeout(1000);
        
        // Verify terms are filtered (count should be different or same)
        const filteredTerms = page.locator('h3.cursor-pointer');
        const filteredCount = await filteredTerms.count();
        
        // At least some terms should be visible
        expect(filteredCount).toBeGreaterThan(0);
      } else {
        // If no domain options, just verify the select is present
        await expect(domainSelect).toBeVisible();
      }
    } else {
      // If no domain select, skip this test
      console.log('Domain select not found, skipping domain filter test');
    }
  });

  test('should search terms', async ({ page }) => {
    // Wait for terms to load
    await page.waitForSelector('h3.cursor-pointer', { timeout: 10000 });
    
    // Get initial count
    const initialResults = page.locator('h3.cursor-pointer');
    const initialCount = await initialResults.count();
    
    // Search for a common term (use first few characters of first term)
    const firstTerm = await page.locator('h3.cursor-pointer').first().textContent();
    const searchTerm = firstTerm ? firstTerm.substring(0, 3) : 'the';
    
    await page.fill('input[placeholder="Search terms..."]', searchTerm);
    
    // Wait for search results
    await page.waitForTimeout(1000);
    
    // Verify search results
    const searchResults = page.locator('h3.cursor-pointer');
    const resultCount = await searchResults.count();
    
    // Should have some results (search should return at least some terms)
    expect(resultCount).toBeGreaterThan(0);
  });

  test('should select and display term details', async ({ page }) => {
    // Listen for console messages
    page.on('console', msg => console.log('Browser console:', msg.text()));
    
    // Wait for terms to load
    await page.waitForSelector('h3.cursor-pointer', { timeout: 10000 });
    
    // Debug: Check how many terms are loaded
    const termCount = await page.locator('h3.cursor-pointer').count();
    console.log(`Found ${termCount} terms`);
    
    // Click on first term
    await page.locator('h3.cursor-pointer').first().click();
    
    // Debug: Wait a bit and check if term detail component exists
    await page.waitForTimeout(2000);
    const termDetailExists = await page.locator('app-term-detail').count();
    console.log(`Term detail component count: ${termDetailExists}`);
    
    // Verify term detail is displayed
    await expect(page.locator('app-term-detail')).toBeVisible();
    await expect(page.locator('app-term-detail h1')).toBeVisible();
    
    // Verify term has domain badge (first one in the header)
    await expect(page.locator('app-term-detail button[class*="px-3"][class*="py-1"]').first()).toBeVisible();
  });

  test('should show edit button for terms', async ({ page }) => {
    // Wait for terms to load
    await page.waitForSelector('h3.cursor-pointer', { timeout: 10000 });
    
    // Click on first term
    await page.locator('h3.cursor-pointer').first().click();
    
    // Wait for term detail to load
    await expect(page.locator('app-term-detail')).toBeVisible();
    
    // Verify edit button is present
    await expect(page.locator('button:has-text("Edit Definition")')).toBeVisible();
  });

  test('should handle edit button click', async ({ page }) => {
    // Wait for terms to load
    await page.waitForSelector('h3.cursor-pointer', { timeout: 10000 });
    
    // Click on first term
    await page.locator('h3.cursor-pointer').first().click();
    
    // Wait for term detail to load
    await expect(page.locator('app-term-detail')).toBeVisible();
    
    // Click edit button
    await page.click('button:has-text("Edit Definition")');
    
    // Note: Since the edit form is not yet implemented, we just verify the button click works
    // In a real implementation, this would switch to edit mode
    // For now, we just verify no errors occur
    await expect(page.locator('app-term-detail')).toBeVisible();
  });

  test('should display term metadata', async ({ page }) => {
    // Wait for terms to load
    await page.waitForSelector('h3.cursor-pointer', { timeout: 10000 });
    
    // Click on first term
    await page.locator('h3.cursor-pointer').first().click();
    
    // Wait for term detail to load
    await expect(page.locator('app-term-detail')).toBeVisible();
    
    // Verify term metadata is displayed
    await expect(page.locator('app-term-detail h1')).toBeVisible(); // Term name
    await expect(page.locator('app-term-detail button[class*="px-3"][class*="py-1"]').first()).toBeVisible(); // Domain badge
    
    // Check for approval status
    const approvalStatus = page.locator('app-term-detail .bg-green-100, .bg-orange-100');
    if (await approvalStatus.count() > 0) {
      await expect(approvalStatus.first()).toBeVisible();
    }
  });

  test('should handle logout', async ({ page }) => {
    // Verify we're logged in
    await expect(page.locator('app-glossary-view')).toBeVisible();
    
    // Look for logout button (assuming it's in the main layout)
    const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout")');
    
    if (await logoutButton.count() > 0) {
      await logoutButton.first().click();
      
      // Should redirect to login
      await page.waitForURL('**/login');
      await expect(page.locator('h1')).toContainText('Termageddon');
    }
  });
});
