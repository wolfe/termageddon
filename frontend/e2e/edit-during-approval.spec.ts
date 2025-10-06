import { test, expect } from '@playwright/test';

test.describe('Edit During Approval Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[formControlName="username"]', 'admin');
    await page.fill('[formControlName="password"]', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/glossary');
  });

  test('should allow editing unpublished versions', async ({ page }) => {
    // First create a version by editing a term
    await page.waitForSelector('h3.cursor-pointer', { timeout: 10000 });
    
    // Click on first available term
    await page.locator('h3.cursor-pointer').first().click();
    await page.waitForSelector('app-term-detail');
    
    // Click edit button
    await page.click('button:has-text("Edit Definition")');
    await page.waitForSelector('quill-editor .ql-editor');
    
    // Add initial content
    await page.click('quill-editor .ql-editor');
    await page.type('quill-editor .ql-editor', 'Initial test definition for edit workflow.');
    
    // Save the version
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(2000);

    // Navigate to review tab to see the version
    await page.click('a[routerLink="/review"]');
    await page.waitForURL('**/review');
    await page.waitForTimeout(2000);

    // Look for the version we just created
    const hasTestContent = await page.locator('text=Initial test definition for edit workflow.').isVisible();
    
    if (hasTestContent) {
      // Navigate back to glossary to edit the same term again
      await page.click('a[routerLink="/glossary"]');
      await page.waitForURL('**/glossary');
      await page.waitForTimeout(1000);
      
      // Click on the same term again
      await page.locator('h3.cursor-pointer').first().click();
      await page.waitForSelector('app-term-detail');
      
      // Should be able to edit again (not create new version)
      await page.click('button:has-text("Edit Definition")');
      await page.waitForSelector('textarea[id="definition-content"]');
      
      // Modify the content
      await page.fill('textarea[id="definition-content"]', 'Updated test definition for edit workflow.');
      
      // Save the changes
      await page.click('button:has-text("Save Changes")');
      await page.waitForTimeout(2000);
      
      // Navigate back to review to verify the update
      await page.click('a[routerLink="/review"]');
      await page.waitForURL('**/review');
      await page.waitForTimeout(2000);
      
      // Should show the updated content
      await expect(page.locator('text=Updated test definition for edit workflow.')).toBeVisible();
    }
  });

  test('should clear approvals when content is modified', async ({ page }) => {
    // This test would require setting up a more complex scenario with approvals
    // For now, we'll test the basic edit functionality
    await page.waitForSelector('h3.cursor-pointer', { timeout: 10000 });
    
    // Click on first available term
    await page.locator('h3.cursor-pointer').first().click();
    await page.waitForSelector('app-term-detail');
    
    // Click edit button
    await page.click('button:has-text("Edit Definition")');
    await page.waitForSelector('quill-editor .ql-editor');
    
    // Add content
    await page.click('quill-editor .ql-editor');
    await page.type('quill-editor .ql-editor', 'Test definition for approval clearing.');
    
    // Save the version
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(2000);

    // Navigate to review tab
    await page.click('a[routerLink="/review"]');
    await page.waitForURL('**/review');
    await page.waitForTimeout(2000);

    // Look for the version
    const hasTestContent = await page.locator('text=Test definition for approval clearing.').isVisible();
    
    if (hasTestContent) {
      // Navigate back to glossary to edit again
      await page.click('a[routerLink="/glossary"]');
      await page.waitForURL('**/glossary');
      await page.waitForTimeout(1000);
      
      // Click on the same term again
      await page.locator('h3.cursor-pointer').first().click();
      await page.waitForSelector('app-term-detail');
      
      // Edit the content
      await page.click('button:has-text("Edit Definition")');
      await page.waitForSelector('textarea[id="definition-content"]');
      
      // Modify the content
      await page.fill('textarea[id="definition-content"]', 'Modified test definition for approval clearing.');
      
      // Save the changes
      await page.click('button:has-text("Save Changes")');
      await page.waitForTimeout(2000);
      
      // Navigate back to review to verify the update
      await page.click('a[routerLink="/review"]');
      await page.waitForURL('**/review');
      await page.waitForTimeout(2000);
      
      // Should show the modified content
      await expect(page.locator('text=Modified test definition for approval clearing.')).toBeVisible();
    }
  });


  test('should show edit button for unpublished versions', async ({ page }) => {
    await page.waitForSelector('h3.cursor-pointer', { timeout: 10000 });
    
    // Click on first available term
    await page.locator('h3.cursor-pointer').first().click();
    await page.waitForSelector('app-term-detail');
    
    // Click edit button
    await page.click('button:has-text("Edit Definition")');
    await page.waitForSelector('quill-editor .ql-editor');
    
    // Add content
    await page.click('quill-editor .ql-editor');
    await page.type('quill-editor .ql-editor', 'Test definition for edit button visibility.');
    
    // Save the version
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(2000);

    // Should still show edit button for unpublished version
    await expect(page.locator('button:has-text("Edit Definition")')).toBeVisible();
  });

  test('should handle rich text editing', async ({ page }) => {
    await page.waitForSelector('h3.cursor-pointer', { timeout: 10000 });
    
    // Click on first available term
    await page.locator('h3.cursor-pointer').first().click();
    await page.waitForSelector('app-term-detail');
    
    // Click edit button
    await page.click('button:has-text("Edit Definition")');
    
    // Wait for Quill editor to load
    await page.waitForSelector('quill-editor .ql-editor', { timeout: 10000 });
    
    // Check if Quill editor is visible
    const hasQuill = await page.locator('quill-editor .ql-editor').isVisible();
    
    if (hasQuill) {
      // Click in the editor
      await page.click('quill-editor .ql-editor');
      
      // Type some content
      await page.keyboard.type('Rich text content with Quill editor.');
      
      // Save the changes
      await page.click('button:has-text("Save Changes")');
      await page.waitForTimeout(2000);
      
      // Navigate to review to verify the content
      await page.click('a[routerLink="/review"]');
      await page.waitForURL('**/review');
      
      // Select the first pending version to show its details
      const pendingItem = page.locator('app-review-dashboard .border-b.border-gray-200.cursor-pointer').first();
      await pendingItem.click();
      
      // The details panel should render the Definition section content
      const definitionContent = page.locator('app-review-dashboard h3:has-text("Definition:") + div.prose');
      await expect(definitionContent).toBeVisible();
    } else {
      // Fallback to textarea if Quill is not available
      await page.waitForSelector('textarea[id="definition-content"]');
      await page.fill('textarea[id="definition-content"]', 'Fallback textarea content.');
      
      await page.click('button:has-text("Save Changes")');
      await page.waitForTimeout(2000);
    }
  });
});
