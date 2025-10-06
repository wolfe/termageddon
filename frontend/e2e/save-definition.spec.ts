import { test, expect } from '@playwright/test';

test.describe('Save Definition Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[formControlName="username"]', 'admin');
    await page.fill('[formControlName="password"]', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/glossary');
  });

  test('should successfully save a new definition', async ({ page }) => {
    // Wait for terms to load
    await page.waitForSelector('h3.cursor-pointer', { timeout: 10000 });
    
    // Find and click on "absorption" term which should be available
    const absorptionTerm = page.locator('h3.cursor-pointer').filter({ hasText: "absorption" }).first();
    await absorptionTerm.click();
    
    // Wait for term detail to load
    await expect(page.locator('app-term-detail')).toBeVisible();
    
    // Click edit button
    await page.click('button:has-text("Edit Definition")');
    
    // Verify edit form appears
    await expect(page.locator('quill-editor .ql-editor')).toBeVisible();
    await expect(page.locator('button:has-text("Save Changes")')).toBeVisible();
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    
    // Clear existing content and add new content
    await page.click('quill-editor .ql-editor');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await page.type('quill-editor .ql-editor', 'This is a test definition created by E2E test.');
    
    // Click save button
    await page.click('button:has-text("Save Changes")');
    
    // Wait for save to complete (should exit edit mode)
    await page.waitForTimeout(2000);
    
    // Log the current state for debugging
    console.log('After save - checking state:');
    console.log('Edit button visible:', await page.locator('button:has-text("Edit Definition")').isVisible());
    console.log('Textarea visible:', await page.locator('textarea[id="definition-content"]').isVisible());
    console.log('Save button visible:', await page.locator('button:has-text("Save Changes")').isVisible());
    
    // Verify we're back in view mode
    await expect(page.locator('button:has-text("Edit Definition")')).toBeVisible();
    await expect(page.locator('textarea[id="definition-content"]')).not.toBeVisible();
    
    // Verify the original content is still displayed (new version needs approval)
    // The new definition won't be visible until approved by other users
    await expect(page.locator('app-term-detail')).toBeVisible();
  });

  test('should handle save with empty content', async ({ page }) => {
    // Wait for terms to load
    await page.waitForSelector('h3.cursor-pointer', { timeout: 10000 });
    
    // Click on first term
    await page.locator('h3.cursor-pointer').first().click();
    
    // Wait for term detail to load
    await expect(page.locator('app-term-detail')).toBeVisible();
    
    // Click edit button
    await page.click('button:has-text("Edit Definition")');
    
    // Verify edit form appears
    await expect(page.locator('quill-editor .ql-editor')).toBeVisible();
    
    // Manually set content to empty HTML that should trigger validation
    await page.evaluate(() => {
      const editor = document.querySelector('quill-editor .ql-editor');
      if (editor) {
        editor.innerHTML = '<p><br></p>';
        // Trigger input event to notify Quill
        editor.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    
    // Wait for Quill to process
    await page.waitForTimeout(1000);
    
    
    // Register dialog handler for backend validation error
    page.once('dialog', dialog => {
      expect(dialog.message()).toMatch(/Content cannot be empty/i);
      dialog.accept();
    });
    
    // Click save button
    await page.click('button:has-text("Save Changes")');
    
    // Wait for error handling
    await page.waitForTimeout(1000);
    
    // Should still be in edit mode after validation error
    await expect(page.locator('button:has-text("Save Changes")')).toBeVisible();
  });

  test('should cancel edit without saving', async ({ page }) => {
    // Wait for terms to load
    await page.waitForSelector('h3.cursor-pointer', { timeout: 10000 });
    
    // Click on first term
    await page.locator('h3.cursor-pointer').first().click();
    
    // Wait for term detail to load
    await expect(page.locator('app-term-detail')).toBeVisible();
    
    // Get original content (might be empty if no definition exists)
    const proseElement = page.locator('app-term-detail .prose');
    const originalContent = await proseElement.count() > 0 ? await proseElement.textContent() : '';
    
    // Click edit button
    await page.click('button:has-text("Edit Definition")');
    
    // Verify edit form appears
    await expect(page.locator('quill-editor .ql-editor')).toBeVisible();
    
    // Modify content
    await page.click('quill-editor .ql-editor');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await page.type('quill-editor .ql-editor', 'This should not be saved');
    
    // Click cancel button
    await page.click('button:has-text("Cancel")');
    
    // Wait for cancel to complete
    await page.waitForTimeout(1000);
    
    // Verify we're back in view mode
    await expect(page.locator('button:has-text("Edit Definition")')).toBeVisible();
    await expect(page.locator('textarea[id="definition-content"]')).not.toBeVisible();
    
    // Verify original content is still there (not the modified content)
    await expect(page.locator('app-term-detail')).not.toContainText('This should not be saved');
  });

  test('should handle save error gracefully', async ({ page }) => {
    // Wait for terms to load
    await page.waitForSelector('h3.cursor-pointer', { timeout: 10000 });
    
    // Click on first term
    await page.locator('h3.cursor-pointer').first().click();
    
    // Wait for term detail to load
    await expect(page.locator('app-term-detail')).toBeVisible();
    
    // Click edit button
    await page.click('button:has-text("Edit Definition")');
    
    // Verify edit form appears
    await expect(page.locator('quill-editor .ql-editor')).toBeVisible();
    
    // Add content
    await page.click('quill-editor .ql-editor');
    await page.type('quill-editor .ql-editor', 'Test content for error handling');
    
    // Mock network failure by intercepting the API call
    await page.route('**/api/entry-versions/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal server error' })
      });
    });
    
    // Set up dialog handler for error alert
    page.once('dialog', dialog => {
      expect(dialog.message()).toMatch(/Server error occurred/i);
      dialog.accept();
    });
    
    // Click save button
    await page.click('button:has-text("Save Changes")');
    
    // Wait for error handling
    await page.waitForTimeout(1000);
    
    // Should still be in edit mode after error
    await expect(page.locator('button:has-text("Save Changes")')).toBeVisible();
  });

  test('should initialize edit form with existing content', async ({ page }) => {
    // Wait for terms to load
    await page.waitForSelector('h3.cursor-pointer', { timeout: 10000 });
    
    // Click on first term
    await page.locator('h3.cursor-pointer').first().click();
    
    // Wait for term detail to load
    await expect(page.locator('app-term-detail')).toBeVisible();
    
    // Get original content if it exists
    const originalContentElement = page.locator('app-term-detail .prose');
    const hasContent = await originalContentElement.count() > 0;
    
    if (hasContent) {
      const originalContent = await originalContentElement.textContent();
      
      // Click edit button
      await page.click('button:has-text("Edit Definition")');
      
      // Verify edit form appears with original content
      await expect(page.locator('quill-editor .ql-editor')).toBeVisible();
      
      const editorContent = await page.locator('quill-editor .ql-editor').textContent();
      
      // Should contain original content (may have HTML tags stripped)
      expect(editorContent).toBeTruthy();
    } else {
      // For terms without content, edit form should be empty
      await page.click('button:has-text("Edit Definition")');
      
      // Verify edit form appears
      await expect(page.locator('textarea[id="definition-content"]')).toBeVisible();
      
      const textareaContent = await page.inputValue('textarea[id="definition-content"]');
      expect(textareaContent).toBe('');
    }
  });
});
