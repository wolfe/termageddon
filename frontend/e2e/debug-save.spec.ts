import { test, expect } from '@playwright/test';

test.describe('Debug Save Issue', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[formControlName="username"]', 'admin');
    await page.fill('[formControlName="password"]', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/glossary');
  });

  test('debug save workflow step by step', async ({ page }) => {
    // Wait for terms to load
    await page.waitForSelector('h3.cursor-pointer', { timeout: 10000 });
    
    // Click on first term
    await page.locator('h3.cursor-pointer').first().click();
    
    // Wait for term detail to load
    await expect(page.locator('app-term-detail')).toBeVisible();
    
    // Check if edit button exists
    const editButton = page.locator('button:has-text("Edit Definition")');
    await expect(editButton).toBeVisible();
    
    // Click edit button
    await editButton.click();
    
    // Verify edit form appears
    await expect(page.locator('quill-editor .ql-editor')).toBeVisible();
    
    // Add some content
    await page.click('quill-editor .ql-editor');
    await page.type('quill-editor .ql-editor', 'Debug test content');
    
    // Check console logs
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    
    // Click save button
    await page.click('button:has-text("Save Changes")');
    
    // Wait a bit for the save to process
    await page.waitForTimeout(3000);
    
    // Check what's visible now
    const editButtonAfter = page.locator('button:has-text("Edit Definition")');
    const textareaAfter = page.locator('textarea[id="definition-content"]');
    
    console.log('Edit button visible after save:', await editButtonAfter.count() > 0);
    console.log('Textarea visible after save:', await textareaAfter.count() > 0);
    
    // Take a screenshot
    await page.screenshot({ path: 'debug-after-save.png' });
  });
});
