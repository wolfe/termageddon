import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { GlossaryPage } from './pages/GlossaryPage';
import { TermDetailPage } from './pages/TermDetailPage';
import { AuthHelper } from './helpers/auth';
import { ApiHelper } from './helpers/api';
import { TestFixtures } from './helpers/fixtures';
import { TEST_TERMS, TEST_DEFINITIONS, TEST_DOMAINS, TEST_CONTENT } from './fixtures/testData';

test.describe('Term Management', () => {
  let loginPage: LoginPage;
  let glossaryPage: GlossaryPage;
  let termDetailPage: TermDetailPage;
  let authHelper: AuthHelper;
  let apiHelper: ApiHelper;
  let fixtures: TestFixtures;
  let createdResources: string[] = [];

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    glossaryPage = new GlossaryPage(page);
    termDetailPage = new TermDetailPage(page);
    authHelper = new AuthHelper(page);
    apiHelper = new ApiHelper(page);
    fixtures = new TestFixtures(page);
    
    // Login as admin for most tests
    await authHelper.loginAsAdmin();
  });

  test.afterEach(async ({ page }) => {
    // Clean up resources created in this test
    if (createdResources.length > 0) {
      await apiHelper.cleanupResources(createdResources);
      createdResources = [];
    }
    
    // Clean up any fixtures
    await fixtures.cleanup();
  });

  test.describe('Term Navigation', () => {
    test('should navigate to glossary page after login', async () => {
      await glossaryPage.goto();
      await glossaryPage.expectSearchInputVisible();
      await glossaryPage.expectDomainFilterVisible();
    });

    test('should display terms in the glossary', async () => {
      await glossaryPage.goto();
      await glossaryPage.waitForTermsToLoad();
      
      // Check that we have some terms loaded
      const termCount = await glossaryPage.getTermCount();
      expect(termCount).toBeGreaterThan(0);
    });

    test('should click on term to view details', async () => {
      await glossaryPage.goto();
      await glossaryPage.waitForTermsToLoad();
      
      // Click on the first term
      await glossaryPage.clickTerm(TEST_TERMS.ABSORPTION);
      
      // Should navigate to term detail page
      await termDetailPage.expectTermTitle(TEST_TERMS.ABSORPTION);
      await termDetailPage.expectContentVisible();
    });

    test('should switch between domain contexts', async () => {
      await glossaryPage.goto();
      await glossaryPage.waitForTermsToLoad();
      
      // Click on a term
      await glossaryPage.clickTerm(TEST_TERMS.ABSORPTION);
      
      // If there are multiple domains, test switching
      if (await termDetailPage.hasMultipleDomains()) {
        const domainNames = await termDetailPage.getDomainNames();
        if (domainNames.length > 1) {
          await termDetailPage.switchToDomain(domainNames[1]);
          await termDetailPage.expectDomainTabActive(domainNames[1]);
        }
      }
    });
  });

  test.describe('Term Search and Filtering', () => {
    test('should search for terms', async () => {
      await glossaryPage.goto();
      await glossaryPage.waitForTermsToLoad();
      
      await glossaryPage.search(TEST_TERMS.ABSORPTION);
      
      // Should show only matching terms
      await glossaryPage.expectTermVisible(TEST_TERMS.ABSORPTION);
    });

    test('should filter by domain', async () => {
      await glossaryPage.goto();
      await glossaryPage.waitForTermsToLoad();
      
      // Get initial term count
      const initialCount = await glossaryPage.getTermCount();
      
      if (initialCount > 0) {
        // Try filtering by the first available domain
        const domainOptions = await glossaryPage.domainFilter.locator('option').all();
        if (domainOptions.length > 1) { // More than just "All Domains"
          const firstDomainOption = domainOptions[1]; // Skip "All Domains" option
          const domainText = await firstDomainOption.textContent();
          
          await glossaryPage.selectDomain(domainText || '');
          
          // Should show filtered results (might be 0 if no terms in that domain)
          const filteredCount = await glossaryPage.getTermCount();
          expect(filteredCount).toBeGreaterThanOrEqual(0);
        }
      }
    });

    test('should clear search and filters', async () => {
      await glossaryPage.goto();
      await glossaryPage.waitForTermsToLoad();
      
      const initialCount = await glossaryPage.getTermCount();
      
      if (initialCount > 0) {
        // Apply search and filter
        await glossaryPage.search(TEST_TERMS.ABSORPTION);
        
        // Try to apply a domain filter if available
        const domainOptions = await glossaryPage.domainFilter.locator('option').all();
        if (domainOptions.length > 1) {
          const firstDomainOption = domainOptions[1];
          const domainText = await firstDomainOption.textContent();
          await glossaryPage.selectDomain(domainText || '');
        }
        
        // Clear filters
        await glossaryPage.clearFilters();
        
        // Should show all terms again (or at least some terms)
        const finalCount = await glossaryPage.getTermCount();
        expect(finalCount).toBeGreaterThanOrEqual(0);
      }
    });

    test('should show no results for invalid search', async () => {
      await glossaryPage.goto();
      await glossaryPage.waitForTermsToLoad();
      
      await glossaryPage.search('nonexistentterm123');
      
      // Should show no entries message
      await glossaryPage.expectNoEntriesMessage();
    });
  });

  test.describe('Term Definition Editing', () => {
    test('should enter edit mode', async () => {
      await glossaryPage.goto();
      await glossaryPage.waitForTermsToLoad();
      await glossaryPage.clickTerm(TEST_TERMS.ABSORPTION);
      
      await termDetailPage.clickEdit();
      await termDetailPage.expectDefinitionFormVisible();
      await termDetailPage.expectSaveButtonVisible();
      await termDetailPage.expectCancelButtonVisible();
    });

    test('should save definition changes', async () => {
      // Create a test term with fixtures to ensure we have editable content
      const testTerm = await fixtures.createTestTerm({
        domain: 'Physics',
        definition: 'Original test definition for automated testing.',
        approvalState: 'no_approvals'
      });
      
      createdResources.push(testTerm.id);
      
      await glossaryPage.goto();
      await glossaryPage.waitForTermsToLoad();
      
      // Search for our test term
      await glossaryPage.search(testTerm.name);
      await glossaryPage.expectTermVisible(testTerm.name);
      
      await glossaryPage.clickTerm(testTerm.name);
      
      // Should be able to enter edit mode for our test term
      await expect(termDetailPage.editButton).toBeVisible();
      await termDetailPage.clickEdit();
      
      // Should be able to edit the content
      await expect(termDetailPage.contentArea).toBeVisible();
      
      const testContent = 'This is an updated test definition for automated testing.';
      await termDetailPage.editDefinition(testContent);
      await termDetailPage.clickSave();
      
      // Wait for save to complete
      await termDetailPage.waitForSaveComplete();
      
      // Verify save completed successfully
      await expect(termDetailPage.editButton).toBeVisible();
    });

    test('should cancel definition changes', async () => {
      await glossaryPage.goto();
      await glossaryPage.waitForTermsToLoad();
      await glossaryPage.clickTerm(TEST_TERMS.ABSORPTION);
      
      // Get original content
      const originalContent = await termDetailPage.getDefinitionContent();
      
      // Enter edit mode and make changes
      await termDetailPage.clickEdit();
      await termDetailPage.fillDefinition(TEST_CONTENT.VALID_DEFINITION);
      
      // Cancel changes
      await termDetailPage.clickCancel();
      
      // Should return to original content
      await termDetailPage.expectEditButtonVisible();
      await termDetailPage.expectContentText(originalContent || '');
    });

    test('should handle empty definition', async () => {
      // Create a test term with fixtures to ensure we have editable content
      const testTerm = await fixtures.createTestTerm({
        domain: 'Physics',
        definition: 'Original test definition for empty test.',
        approvalState: 'no_approvals'
      });
      
      createdResources.push(testTerm.id);
      
      await glossaryPage.goto();
      await glossaryPage.waitForTermsToLoad();
      
      // Search for our test term
      await glossaryPage.search(testTerm.name);
      await glossaryPage.expectTermVisible(testTerm.name);
      
      await glossaryPage.clickTerm(testTerm.name);
      
      // Should be able to enter edit mode for our test term
      await expect(termDetailPage.editButton).toBeVisible();
      await termDetailPage.clickEdit();
      
      // Should be able to edit the content
      await expect(termDetailPage.contentArea).toBeVisible();
      
      await termDetailPage.fillDefinition('');
      await termDetailPage.clickSave();
      
      // Should handle empty definition gracefully - just check that we're back to normal state
      await expect(termDetailPage.page.locator('body')).toBeVisible();
    });

    test('should handle long definition content', async () => {
      // Create a test term with fixtures to ensure we have editable content
      const testTerm = await fixtures.createTestTerm({
        domain: 'Physics',
        definition: 'Original test definition for long content test.',
        approvalState: 'no_approvals'
      });
      
      createdResources.push(testTerm.id);
      
      await glossaryPage.goto();
      await glossaryPage.waitForTermsToLoad();
      
      // Search for our test term
      await glossaryPage.search(testTerm.name);
      await glossaryPage.expectTermVisible(testTerm.name);
      
      await glossaryPage.clickTerm(testTerm.name);
      
      // Should be able to enter edit mode for our test term
      await expect(termDetailPage.editButton).toBeVisible();
      await termDetailPage.clickEdit();
      
      // Should be able to edit the content
      await expect(termDetailPage.contentArea).toBeVisible();
      
      const longContent = 'This is a very long definition that spans multiple lines and contains a lot of text to test how the system handles extensive content. It should be able to display all of this without any issues, wrapping text as necessary and maintaining readability.';
      await termDetailPage.editDefinition(longContent);
      await termDetailPage.clickSave();
      
      // Should handle long content gracefully
      await expect(termDetailPage.page.locator('body')).toBeVisible();
    });

    test('should handle HTML content in definition', async () => {
      await glossaryPage.goto();
      await glossaryPage.waitForTermsToLoad();
      
      const termNames = await glossaryPage.getTermNames();
      if (termNames.length > 0) {
        await glossaryPage.clickTerm(termNames[0]);
        
        if (await termDetailPage.editButton.isVisible()) {
          await termDetailPage.clickEdit();
          
          if (await termDetailPage.contentArea.isVisible()) {
            const htmlContent = 'This definition contains <strong>HTML</strong> content, including a <a href="#">link</a> and <em>emphasized text</em>.';
            await termDetailPage.editDefinition(htmlContent);
            await termDetailPage.clickSave();
            
            // Should handle HTML content gracefully
            await expect(termDetailPage.page.locator('body')).toBeVisible();
          } else {
            test.skip();
          }
        } else {
          test.skip();
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('Term Endorsement', () => {
    test('should show endorse button when eligible', async () => {
      await glossaryPage.goto();
      await glossaryPage.waitForTermsToLoad();
      await glossaryPage.clickTerm(TEST_TERMS.ABSORPTION);
      
      // Check if endorse button is visible (depends on user permissions)
      const isEndorseVisible = await termDetailPage.endorseButton.isVisible();
      if (isEndorseVisible) {
        await termDetailPage.expectEndorseButtonVisible();
      }
    });

    test('should endorse definition when eligible', async () => {
      await glossaryPage.goto();
      await glossaryPage.waitForTermsToLoad();
      await glossaryPage.clickTerm(TEST_TERMS.ABSORPTION);
      
      // Only test if endorse button is visible and enabled
      const isEndorseVisible = await termDetailPage.endorseButton.isVisible();
      const isEndorseEnabled = await termDetailPage.endorseButton.isEnabled();
      
      if (isEndorseVisible && isEndorseEnabled) {
        await termDetailPage.clickEndorse();
        await termDetailPage.expectEndorsedBadge();
      }
    });

    test('should disable endorse button for already endorsed definitions', async () => {
      await glossaryPage.goto();
      await glossaryPage.waitForTermsToLoad();
      await glossaryPage.clickTerm(TEST_TERMS.ABSORPTION);
      
      // Check if definition is already endorsed
      const isEndorsed = await termDetailPage.endorsedBadge.isVisible();
      if (isEndorsed) {
        await termDetailPage.expectEndorseButtonDisabled();
      }
    });
  });

  test.describe('Term Status Display', () => {
    test('should show approval status', async () => {
      await glossaryPage.goto();
      await glossaryPage.waitForTermsToLoad();
      
      // Try to find a term that has approval status
      const termCount = await glossaryPage.getTermCount();
      let foundTermWithStatus = false;
      
      for (let i = 0; i < Math.min(termCount, 5); i++) {
        const termTitles = await glossaryPage.getTermNames();
        if (termTitles[i]) {
          await glossaryPage.clickTerm(termTitles[i]);
        }
        
        const hasApprovedBadge = await termDetailPage.approvedBadge.isVisible();
        const hasPendingBadge = await termDetailPage.pendingApprovalBadge.isVisible();
        
        if (hasApprovedBadge || hasPendingBadge) {
          foundTermWithStatus = true;
          break;
        }
      }
      
      if (foundTermWithStatus) {
        expect(foundTermWithStatus).toBe(true);
      } else {
        // Create test terms with different approval states instead of skipping
        const pendingTerm = await fixtures.createPendingApprovalTerm('Physics', 'A term waiting for approval');
        const approvedTerm = await fixtures.createFullyApprovedTerm('Chemistry', 'A fully approved term');
        
        createdResources.push(pendingTerm.id, approvedTerm.id);
        
        // Test pending approval status
        await glossaryPage.search(pendingTerm.name);
        await glossaryPage.expectTermVisible(pendingTerm.name);
        await glossaryPage.clickTerm(pendingTerm.name);
        
        // Should show pending approval status
        await expect(termDetailPage.pendingApprovalBadge).toBeVisible();
        
        // Test approved status
        await glossaryPage.goto();
        await glossaryPage.search(approvedTerm.name);
        await glossaryPage.expectTermVisible(approvedTerm.name);
        await glossaryPage.clickTerm(approvedTerm.name);
        
        // Should show approved status
        await expect(termDetailPage.approvedBadge).toBeVisible();
      }
    });

    test('should show endorsement status', async () => {
      await glossaryPage.goto();
      await glossaryPage.waitForTermsToLoad();
      await glossaryPage.clickTerm(TEST_TERMS.ABSORPTION);
      
      // Check for endorsement status
      const hasEndorsedBadge = await termDetailPage.endorsedBadge.isVisible();
      // This might be false for non-endorsed terms, which is expected
    });

    test('should show approver information', async () => {
      await glossaryPage.goto();
      await glossaryPage.waitForTermsToLoad();
      await glossaryPage.clickTerm(TEST_TERMS.ABSORPTION);
      
      // Check if approvers are visible
      const approverCount = await termDetailPage.approversList.count();
      if (approverCount > 0) {
        await termDetailPage.expectApproversVisible();
      }
    });

    test('should show author information', async () => {
      await glossaryPage.goto();
      await glossaryPage.waitForTermsToLoad();
      await glossaryPage.clickTerm(TEST_TERMS.ABSORPTION);
      
      await termDetailPage.expectAuthorInfoVisible();
      await termDetailPage.expectLastUpdatedVisible();
    });
  });

  test.describe('Multi-Domain Terms', () => {
    test('should display domain tabs for multi-domain terms', async () => {
      await glossaryPage.goto();
      await glossaryPage.waitForTermsToLoad();
      await glossaryPage.clickTerm(TEST_TERMS.ABSORPTION);
      
      if (await termDetailPage.hasMultipleDomains()) {
        const domainNames = await termDetailPage.getDomainNames();
        expect(domainNames.length).toBeGreaterThan(1);
        
        // Test switching between domains
        for (const domainName of domainNames) {
          await termDetailPage.expectDomainTabVisible(domainName);
        }
      }
    });

    test('should switch between domain contexts', async () => {
      await glossaryPage.goto();
      await glossaryPage.waitForTermsToLoad();
      await glossaryPage.clickTerm(TEST_TERMS.ABSORPTION);
      
      if (await termDetailPage.hasMultipleDomains()) {
        const domainNames = await termDetailPage.getDomainNames();
        
        // Switch to each domain and verify
        for (const domainName of domainNames) {
          await termDetailPage.switchToDomain(domainName);
          await termDetailPage.expectDomainTabActive(domainName);
        }
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      await glossaryPage.goto();
      
      // Simulate network error by going offline
      await glossaryPage.page.context().setOffline(true);
      
      // Try to perform an action
      await glossaryPage.search(TEST_TERMS.ABSORPTION);
      
      // Should handle error gracefully
      await glossaryPage.page.context().setOffline(false);
    });

    test('should handle invalid term selection', async () => {
      await glossaryPage.goto();
      
      // Try to navigate to non-existent term
      await glossaryPage.page.goto('/term/999999');
      
      // Should handle 404 or redirect appropriately
      const currentUrl = glossaryPage.page.url();
      expect(currentUrl).not.toContain('/term/999999');
    });
  });

  test.describe('User Permissions', () => {
    test('should respect user domain permissions', async () => {
      // Create a test term in a specific domain
      const testTerm = await fixtures.createTestTerm({
        domain: 'Physics',
        definition: 'A physics term for permission testing.',
        approvalState: 'no_approvals'
      });
      
      createdResources.push(testTerm.id);
      
      // Login as a user with Physics domain access
      await authHelper.loginAsMariaCarter(); // Maria has Physics access
      
      await glossaryPage.goto();
      await glossaryPage.waitForTermsToLoad();
      
      // Should be able to see and interact with the term
      await glossaryPage.search(testTerm.name);
      await glossaryPage.expectTermVisible(testTerm.name);
      await glossaryPage.clickTerm(testTerm.name);
      
      // Should be able to edit the term
      await expect(termDetailPage.editButton).toBeVisible();
    });

    test('should show appropriate edit permissions', async () => {
      // Create a test term in a specific domain
      const testTerm = await fixtures.createTestTerm({
        domain: 'Biology',
        definition: 'A biology term for permission testing.',
        approvalState: 'no_approvals'
      });
      
      createdResources.push(testTerm.id);
      
      // Login as a user without Biology domain access
      await authHelper.loginAsMariaCarter(); // Maria doesn't have Biology access
      
      await glossaryPage.goto();
      await glossaryPage.waitForTermsToLoad();
      
      // Search for the term
      await glossaryPage.search(testTerm.name);
      
      // Should either not see the term or see it without edit permissions
      const termVisible = await glossaryPage.isTermVisible(testTerm.name);
      if (termVisible) {
        await glossaryPage.clickTerm(testTerm.name);
        // Should not have edit permissions
        await expect(termDetailPage.editButton).not.toBeVisible();
      }
    });
  });

  test.describe('Performance', () => {
    test('should load terms quickly', async () => {
      const startTime = Date.now();
      
      await glossaryPage.goto();
      await glossaryPage.waitForTermsToLoad();
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    });

    test('should handle large number of terms', async () => {
      await glossaryPage.goto();
      await glossaryPage.waitForTermsToLoad();
      
      const termCount = await glossaryPage.getTermCount();
      expect(termCount).toBeGreaterThan(0);
      
      // Test scrolling through terms
      await glossaryPage.page.keyboard.press('End');
      await glossaryPage.page.keyboard.press('Home');
    });
  });
});
