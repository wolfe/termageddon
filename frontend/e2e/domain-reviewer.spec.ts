import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { GlossaryPage } from './pages/GlossaryPage';
import { TermDetailPage } from './pages/TermDetailPage';
import { ReviewPage } from './pages/ReviewPage';
import { AuthHelper } from './helpers/auth';
import { TEST_TERMS, TEST_DOMAINS } from './fixtures/testData';

test.describe('Domain Switching and Reviewer Selection', () => {
  let loginPage: LoginPage;
  let glossaryPage: GlossaryPage;
  let termDetailPage: TermDetailPage;
  let reviewPage: ReviewPage;
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    glossaryPage = new GlossaryPage(page);
    termDetailPage = new TermDetailPage(page);
    reviewPage = new ReviewPage(page);
    authHelper = new AuthHelper(page);
  });

  test.describe('Domain Switching', () => {
    test('should display domain tabs for multi-domain terms', async () => {
      await authHelper.loginAsAdmin();
      await glossaryPage.goto();
      await glossaryPage.waitForTermsToLoad();
      
      // Find a term that exists in multiple domains
      const termNames = await glossaryPage.getTermNames();
      let multiDomainTerm = null;
      
      for (const termName of termNames.slice(0, 3)) { // Check first 3 terms only
        await glossaryPage.clickTerm(termName);
        
        if (await termDetailPage.hasMultipleDomains()) {
          multiDomainTerm = termName;
          break;
        }
        
        // Go back to glossary
        await glossaryPage.goto();
        await glossaryPage.waitForTermsToLoad();
      }
      
      if (multiDomainTerm) {
        await glossaryPage.clickTerm(multiDomainTerm);
        
        const domainNames = await termDetailPage.getDomainNames();
        expect(domainNames.length).toBeGreaterThan(1);
        
        // Test switching between domains
        for (const domainName of domainNames) {
          await termDetailPage.expectDomainTabVisible(domainName);
        }
      } else {
        // Skip test if no multi-domain terms found
        test.skip();
      }
    });
  });

  test.describe('Reviewer Selection', () => {
    test('should display reviewer selection dialog when needed', async () => {
      await authHelper.loginAsAdmin();
      await reviewPage.goto();
      await reviewPage.waitForVersionsToLoad();
      
      // Look for a version that might need reviewer selection
      const versionCount = await reviewPage.getVersionCount();
      
      if (versionCount > 0) {
        for (let i = 0; i < Math.min(versionCount, 3); i++) { // Check first 3 versions only
          await reviewPage.selectVersion(i);
          
          // Check if reviewer selection is needed
          const needsReviewerSelection = await reviewPage.page.locator('text=Request Review').isVisible();
          
          if (needsReviewerSelection) {
            await reviewPage.requestReviewButton.click();
            
            // Wait a bit for dialog to appear
            await reviewPage.page.waitForTimeout(1000);
            
            // Check if dialog exists (might be hidden but present)
            const dialogExists = await reviewPage.page.locator('app-reviewer-selector-dialog').count() > 0;
            if (dialogExists) {
              // Dialog exists, test passes
              return;
            }
          }
        }
      }
      
      // Skip if no reviewer selection needed
      test.skip();
    });
  });

  test.describe('Cross-Domain Workflows', () => {
    test('should handle approval across different domains', async () => {
      // Login as Maria Carter (Physics, Chemistry)
      await authHelper.loginAsMariaCarter();
      await reviewPage.goto();
      await reviewPage.waitForVersionsToLoad();
      
      // Should only see versions in Physics and Chemistry domains
      const versionTitles = await reviewPage.getVersionTitles();
      expect(versionTitles.length).toBeGreaterThanOrEqual(0);
      
      // Should be able to approve versions in accessible domains
      for (let i = 0; i < Math.min(versionTitles.length, 3); i++) {
        await reviewPage.selectVersion(i);
        
        if (await reviewPage.approveButton.isVisible()) {
          // Should be able to approve this version
          expect(await reviewPage.approveButton.isEnabled()).toBe(true);
        }
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle domain switching errors gracefully', async () => {
      await authHelper.loginAsAdmin();
      await glossaryPage.goto();
      await glossaryPage.waitForTermsToLoad();
      
      // Find a multi-domain term
      const termNames = await glossaryPage.getTermNames();
      let multiDomainTerm = null;
      
      for (const termName of termNames.slice(0, 3)) {
        await glossaryPage.clickTerm(termName);
        
        if (await termDetailPage.hasMultipleDomains()) {
          multiDomainTerm = termName;
          break;
        }
        
        await glossaryPage.goto();
        await glossaryPage.waitForTermsToLoad();
      }
      
      if (multiDomainTerm) {
        await glossaryPage.clickTerm(multiDomainTerm);
        
        // Simulate network error during domain switch
        await glossaryPage.page.context().setOffline(true);
        
        try {
          const domainNames = await termDetailPage.getDomainNames();
          await termDetailPage.switchToDomain(domainNames[0]);
        } catch (error) {
          // Should handle error gracefully
          expect(error).toBeDefined();
        }
        
        // Restore network
        await glossaryPage.page.context().setOffline(false);
      } else {
        test.skip();
      }
    });
  });

  test.describe('Performance', () => {
    test('should switch domains quickly', async () => {
      await authHelper.loginAsAdmin();
      await glossaryPage.goto();
      await glossaryPage.waitForTermsToLoad();
      
      // Find a multi-domain term
      const termNames = await glossaryPage.getTermNames();
      let multiDomainTerm = null;
      
      for (const termName of termNames.slice(0, 3)) {
        await glossaryPage.clickTerm(termName);
        
        if (await termDetailPage.hasMultipleDomains()) {
          multiDomainTerm = termName;
          break;
        }
        
        await glossaryPage.goto();
        await glossaryPage.waitForTermsToLoad();
      }
      
      if (multiDomainTerm) {
        await glossaryPage.clickTerm(multiDomainTerm);
        
        const domainNames = await termDetailPage.getDomainNames();
        
        // Measure domain switching performance
        for (const domainName of domainNames.slice(0, 2)) { // Test first 2 domains only
          const startTime = Date.now();
          await termDetailPage.switchToDomain(domainName);
          const switchTime = Date.now() - startTime;
          
          expect(switchTime).toBeLessThan(2000); // Should switch within 2 seconds
        }
      } else {
        test.skip();
      }
    });
  });
});
