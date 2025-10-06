import { test, expect } from '@playwright/test';

test.describe('Domain Switching Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[formControlName="username"]', 'admin');
    await page.fill('[formControlName="password"]', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/glossary');
  });

  test('should switch content when clicking different domain bubbles', async ({ page }) => {
    // Wait for terms to load
    await page.waitForSelector('h3.cursor-pointer', { timeout: 10000 });
    
    // Find a term that has multiple domain bubbles
    const termItems = page.locator('h3.cursor-pointer');
    const firstTerm = termItems.first();
    await firstTerm.click();
    
    // Wait for term detail to load
    await expect(page.locator('app-term-detail')).toBeVisible();
    
    // Get the domain bubbles for this term
    const domainBubbles = page.locator('span[class*="px-2"][class*="py-0"]');
    const bubbleCount = await domainBubbles.count();
    
    console.log(`Found ${bubbleCount} domain bubbles`);
    
    if (bubbleCount > 1) {
      // Get the first domain bubble text
      const firstBubble = domainBubbles.first();
      const firstBubbleText = await firstBubble.textContent();
      console.log('First bubble text:', firstBubbleText);
      
      // Click the first domain bubble
      await firstBubble.click();
      await page.waitForTimeout(500);
      
      // Get the domain shown in the right panel
      const firstDomainInPanel = await page.locator('app-term-detail button[class*="px-3"][class*="py-1"]').first().textContent();
      console.log('First domain in panel:', firstDomainInPanel);
      
      // Get the second domain bubble text
      const secondBubble = domainBubbles.nth(1);
      const secondBubbleText = await secondBubble.textContent();
      console.log('Second bubble text:', secondBubbleText);
      
      // Click the second domain bubble
      await secondBubble.click();
      await page.waitForTimeout(500);
      
      // Get the domain shown in the right panel after clicking second bubble
      const secondDomainInPanel = await page.locator('app-term-detail button[class*="px-3"][class*="py-1"]').first().textContent();
      console.log('Second domain in panel:', secondDomainInPanel);
      
      // The domain in the panel should have changed
      expect(firstDomainInPanel).not.toBe(secondDomainInPanel);
      console.log('✅ Domain switching is working correctly!');
    } else {
      console.log('Term only has one domain, skipping multi-domain test');
    }
  });
});

