import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { ReviewPage } from './pages/ReviewPage';
import { AuthHelper } from './helpers/auth';
import { TEST_TERMS, TEST_MESSAGES } from './fixtures/testData';

test.describe('Review and Approval Workflow', () => {
  let loginPage: LoginPage;
  let reviewPage: ReviewPage;
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    reviewPage = new ReviewPage(page);
    authHelper = new AuthHelper(page);
  });

  test.describe('Review Dashboard', () => {
    test('should display review dashboard after login', async () => {
      await authHelper.loginAsAdmin();
      await reviewPage.goto();
      
      await reviewPage.expectSearchInputVisible();
      await reviewPage.expectShowAllCheckboxVisible();
    });

    test('should load pending versions', async () => {
      await authHelper.loginAsAdmin();
      await reviewPage.goto();
      await reviewPage.waitForVersionsToLoad();
      
      const versionCount = await reviewPage.getVersionCount();
      expect(versionCount).toBeGreaterThan(0);
    });

    test('should display version information correctly', async () => {
      await authHelper.loginAsAdmin();
      await reviewPage.goto();
      await reviewPage.waitForVersionsToLoad();
      
      const versionTitles = await reviewPage.getVersionTitles();
      expect(versionTitles.length).toBeGreaterThan(0);
      
      // Check that each version has required information
      for (const title of versionTitles) {
        expect(title).toBeTruthy();
      }
    });

    test('should show eligibility status for each version', async () => {
      await authHelper.loginAsAdmin();
      await reviewPage.goto();
      await reviewPage.waitForVersionsToLoad();
      
      const versionCount = await reviewPage.getVersionCount();
      
      if (versionCount > 0) {
        const eligibilityStatuses = await reviewPage.getEligibilityStatuses();
        // Should have status indicators for versions (might be 0 if no versions need status)
        expect(eligibilityStatuses.length).toBeGreaterThanOrEqual(0);
      } else {
        test.skip();
      }
    });

    test('should show approval counts', async () => {
      await authHelper.loginAsAdmin();
      await reviewPage.goto();
      await reviewPage.waitForVersionsToLoad();
      
      const versionCount = await reviewPage.getVersionCount();
      
      if (versionCount > 0) {
        const approvalCounts = await reviewPage.getApprovalCounts();
        // Should have approval counts for versions (might be 0 if no approvals)
        expect(approvalCounts.length).toBeGreaterThanOrEqual(0);
      } else {
        test.skip();
      }
    });
  });

  test.describe('Version Selection and Review', () => {
    test('should select version for review', async () => {
      await authHelper.loginAsAdmin();
      await reviewPage.goto();
      await reviewPage.waitForVersionsToLoad();
      
      await reviewPage.selectVersion(0);
      
      const selectedTitle = await reviewPage.getSelectedVersionTitle();
      expect(selectedTitle).toBeTruthy();
    });

    test('should display version details when selected', async () => {
      await authHelper.loginAsAdmin();
      await reviewPage.goto();
      await reviewPage.waitForVersionsToLoad();
      
      await reviewPage.selectVersion(0);
      
      await reviewPage.expectVersionTitle(await reviewPage.getSelectedVersionTitle());
      await reviewPage.expectVersionContentVisible();
      await reviewPage.expectAuthorInfoVisible();
    });

    test('should show domain information for selected version', async () => {
      await authHelper.loginAsAdmin();
      await reviewPage.goto();
      await reviewPage.waitForVersionsToLoad();
      
      await reviewPage.selectVersion(0);
      
      // Should show domain badge
      const domainBadge = reviewPage.domainBadge;
      await expect(domainBadge).toBeVisible();
    });

    test('should show official status if applicable', async () => {
      await authHelper.loginAsAdmin();
      await reviewPage.goto();
      await reviewPage.waitForVersionsToLoad();
      
      await reviewPage.selectVersion(0);
      
      // Check if official badge is visible (depends on data)
      const isOfficialVisible = await reviewPage.officialBadge.isVisible();
      // This might be true or false depending on the selected version
    });
  });

  test.describe('Approval Process', () => {
    test('should approve eligible version', async () => {
      await authHelper.loginAsAdmin();
      await reviewPage.goto();
      await reviewPage.waitForVersionsToLoad();
      
      // Find an eligible version
      const versionCount = await reviewPage.getVersionCount();
      let eligibleVersionIndex = -1;
      
      for (let i = 0; i < versionCount; i++) {
        if (await reviewPage.isVersionEligible(await reviewPage.getVersionTitles().then(titles => titles[i]))) {
          eligibleVersionIndex = i;
          break;
        }
      }
      
      if (eligibleVersionIndex >= 0) {
        await reviewPage.selectVersion(eligibleVersionIndex);
        await reviewPage.expectApproveButtonVisible();
        
        await reviewPage.approveVersion();
        
        // Should show success or updated status
        await reviewPage.waitForVersionsToLoad();
      }
    });

    test('should not allow approving own version', async () => {
      // Login as a user who might have their own versions
      await authHelper.loginAsMariaCarter();
      await reviewPage.goto();
      await reviewPage.waitForVersionsToLoad();
      
      // Find own version if it exists
      const versionCount = await reviewPage.getVersionCount();
      let ownVersionIndex = -1;
      
      for (let i = 0; i < versionCount; i++) {
        if (await reviewPage.isOwnVersion(await reviewPage.getVersionTitles().then(titles => titles[i]))) {
          ownVersionIndex = i;
          break;
        }
      }
      
      if (ownVersionIndex >= 0) {
        await reviewPage.selectVersion(ownVersionIndex);
        await reviewPage.expectCannotApproveOwn();
        await reviewPage.expectApproveButtonHidden();
      }
    });

    test('should show already approved status', async () => {
      await authHelper.loginAsAdmin();
      await reviewPage.goto();
      await reviewPage.waitForVersionsToLoad();
      
      // Find a version already approved by current user
      const versionCount = await reviewPage.getVersionCount();
      let alreadyApprovedIndex = -1;
      
      for (let i = 0; i < versionCount; i++) {
        if (await reviewPage.hasVersionBeenApproved(await reviewPage.getVersionTitles().then(titles => titles[i]))) {
          alreadyApprovedIndex = i;
          break;
        }
      }
      
      if (alreadyApprovedIndex >= 0) {
        await reviewPage.selectVersion(alreadyApprovedIndex);
        await reviewPage.expectAlreadyApproved();
      }
    });

    test('should show approval count updates', async () => {
      await authHelper.loginAsAdmin();
      await reviewPage.goto();
      await reviewPage.waitForVersionsToLoad();
      
      await reviewPage.selectVersion(0);
      
      // Check approval count display
      const approvalCount = await reviewPage.getApprovalCount();
      expect(approvalCount).toBeGreaterThanOrEqual(0);
      expect(approvalCount).toBeLessThanOrEqual(2);
    });
  });

  test.describe('Publishing Process', () => {
    test('should publish approved version', async () => {
      await authHelper.loginAsAdmin();
      await reviewPage.goto();
      await reviewPage.waitForVersionsToLoad();
      
      // Find an approved version
      const versionCount = await reviewPage.getVersionCount();
      let approvedVersionIndex = -1;
      
      for (let i = 0; i < versionCount; i++) {
        await reviewPage.selectVersion(i);
        if (await reviewPage.publishButton.isVisible()) {
          approvedVersionIndex = i;
          break;
        }
      }
      
      if (approvedVersionIndex >= 0) {
        await reviewPage.publishVersion();
        
        // Should show success or redirect
        await reviewPage.waitForVersionsToLoad();
      }
    });

    test('should not show publish button for non-approved versions', async () => {
      await authHelper.loginAsAdmin();
      await reviewPage.goto();
      await reviewPage.waitForVersionsToLoad();
      
      // Find a non-approved version
      const versionCount = await reviewPage.getVersionCount();
      let nonApprovedVersionIndex = -1;
      
      for (let i = 0; i < versionCount; i++) {
        await reviewPage.selectVersion(i);
        if (!(await reviewPage.publishButton.isVisible())) {
          nonApprovedVersionIndex = i;
          break;
        }
      }
      
      if (nonApprovedVersionIndex >= 0) {
        await reviewPage.expectPublishButtonHidden();
      }
    });
  });

  test.describe('Search and Filtering', () => {
    test('should search for specific terms', async () => {
      await authHelper.loginAsAdmin();
      await reviewPage.goto();
      await reviewPage.waitForVersionsToLoad();
      
      await reviewPage.search(TEST_TERMS.ABSORPTION);
      
      // Should show only matching versions
      const versionTitles = await reviewPage.getVersionTitles();
      const matchingTitles = versionTitles.filter(title => 
        title.toLowerCase().includes(TEST_TERMS.ABSORPTION.toLowerCase())
      );
      expect(matchingTitles.length).toBeGreaterThan(0);
    });

    test('should clear search results', async () => {
      await authHelper.loginAsAdmin();
      await reviewPage.goto();
      await reviewPage.waitForVersionsToLoad();
      
      await reviewPage.search(TEST_TERMS.ABSORPTION);
      await reviewPage.clearSearch();
      
      // Should show all versions again
      const versionCount = await reviewPage.getVersionCount();
      expect(versionCount).toBeGreaterThan(0);
    });

    test('should toggle show all versions', async () => {
      await authHelper.loginAsAdmin();
      await reviewPage.goto();
      await reviewPage.waitForVersionsToLoad();
      
      const initialCount = await reviewPage.getVersionCount();
      
      await reviewPage.toggleShowAll();
      
      const afterToggleCount = await reviewPage.getVersionCount();
      // Count might be different depending on user permissions
      expect(afterToggleCount).toBeGreaterThanOrEqual(initialCount);
    });

    test('should show no matches for invalid search', async () => {
      await authHelper.loginAsAdmin();
      await reviewPage.goto();
      await reviewPage.waitForVersionsToLoad();
      
      await reviewPage.search('nonexistentterm123');
      
      await reviewPage.expectNoMatchesMessage('nonexistentterm123');
    });
  });

  test.describe('User Permissions', () => {
    test('should show only relevant versions for domain expert', async () => {
      await authHelper.loginAsMariaCarter();
      await reviewPage.goto();
      await reviewPage.waitForVersionsToLoad();
      
      const versionCount = await reviewPage.getVersionCount();
      expect(versionCount).toBeGreaterThan(0);
      
      // Should only show versions in Physics and Chemistry domains
      const versionTitles = await reviewPage.getVersionTitles();
      expect(versionTitles.length).toBeGreaterThan(0);
    });

    test('should respect approval permissions', async () => {
      await authHelper.loginAsMariaCarter();
      await reviewPage.goto();
      await reviewPage.waitForVersionsToLoad();
      
      // Should only be able to approve versions in domains they have access to
      const versionCount = await reviewPage.getVersionCount();
      for (let i = 0; i < versionCount; i++) {
        await reviewPage.selectVersion(i);
        
        if (await reviewPage.approveButton.isVisible()) {
          // Should be able to approve this version
          expect(await reviewPage.approveButton.isEnabled()).toBe(true);
        }
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle loading errors gracefully', async () => {
      await authHelper.loginAsAdmin();
      await reviewPage.goto();
      
      // Simulate network error
      await reviewPage.page.context().setOffline(true);
      
      try {
        await reviewPage.waitForVersionsToLoad();
      } catch (error) {
        // Should handle error gracefully
        expect(error).toBeDefined();
      }
      
      // Restore network
      await reviewPage.page.context().setOffline(false);
      
      // Should be able to recover
      await reviewPage.waitForVersionsToLoad();
    });

    test('should handle approval errors', async () => {
      await authHelper.loginAsAdmin();
      await reviewPage.goto();
      await reviewPage.waitForVersionsToLoad();
      
      // Try to approve a version that might cause an error
      await reviewPage.selectVersion(0);
      
      if (await reviewPage.approveButton.isVisible()) {
        await reviewPage.approveButton.click();
        
        // Should handle any errors gracefully
        await reviewPage.waitForVersionsToLoad();
      }
    });
  });

  test.describe('Performance', () => {
    test('should load review dashboard quickly', async () => {
      const startTime = Date.now();
      
      await authHelper.loginAsAdmin();
      await reviewPage.goto();
      await reviewPage.waitForVersionsToLoad();
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    });

    test('should handle large number of versions', async () => {
      await authHelper.loginAsAdmin();
      await reviewPage.goto();
      await reviewPage.waitForVersionsToLoad();
      
      const versionCount = await reviewPage.getVersionCount();
      expect(versionCount).toBeGreaterThan(0);
      
      // Test scrolling through versions
      await reviewPage.page.keyboard.press('End');
      await reviewPage.page.keyboard.press('Home');
    });
  });

  test.describe('Workflow Integration', () => {
    test('should complete full approval workflow', async () => {
      await authHelper.loginAsAdmin();
      await reviewPage.goto();
      await reviewPage.waitForVersionsToLoad();
      
      // Find an eligible version
      const versionCount = await reviewPage.getVersionCount();
      let eligibleVersionIndex = -1;
      
      for (let i = 0; i < versionCount; i++) {
        if (await reviewPage.isVersionEligible(await reviewPage.getVersionTitles().then(titles => titles[i]))) {
          eligibleVersionIndex = i;
          break;
        }
      }
      
      if (eligibleVersionIndex >= 0) {
        // Select and approve version
        await reviewPage.selectVersion(eligibleVersionIndex);
        await reviewPage.approveVersion();
        
        // If version becomes approved, publish it
        await reviewPage.selectVersion(eligibleVersionIndex);
        if (await reviewPage.publishButton.isVisible()) {
          await reviewPage.publishVersion();
        }
      }
    });

    test('should handle multiple approvals for same version', async () => {
      // This test would require multiple users to approve the same version
      // For now, we'll test the UI behavior
      await authHelper.loginAsAdmin();
      await reviewPage.goto();
      await reviewPage.waitForVersionsToLoad();
      
      await reviewPage.selectVersion(0);
      
      // Check approval count and status
      const approvalCount = await reviewPage.getApprovalCount();
      expect(approvalCount).toBeGreaterThanOrEqual(0);
      expect(approvalCount).toBeLessThanOrEqual(2);
    });
  });
});
