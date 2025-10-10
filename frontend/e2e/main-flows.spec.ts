import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { GlossaryPage } from './pages/GlossaryPage';
import { TermDetailPage } from './pages/TermDetailPage';
import { ReviewPage } from './pages/ReviewPage';
import { AuthHelper } from './helpers/auth';
import { ApiHelper } from './helpers/api';
import { TestFixtures } from './helpers/fixtures';
import { TEST_USERS, TEST_TERMS, TEST_DEFINITIONS, TEST_CONTENT } from './fixtures/testData';

test.describe('Termageddon Main Flows', () => {
  let loginPage: LoginPage;
  let glossaryPage: GlossaryPage;
  let termDetailPage: TermDetailPage;
  let reviewPage: ReviewPage;
  let authHelper: AuthHelper;
  let apiHelper: ApiHelper;
  let fixtures: TestFixtures;
  let createdResources: string[] = [];

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    glossaryPage = new GlossaryPage(page);
    termDetailPage = new TermDetailPage(page);
    reviewPage = new ReviewPage(page);
    authHelper = new AuthHelper(page);
    apiHelper = new ApiHelper(page);
    fixtures = new TestFixtures(page);
  });

  test.afterEach(async ({ page }) => {
    // Clean up created resources
    for (const resource of createdResources) {
      await apiHelper.cleanupResource(resource);
    }
    createdResources = [];
  });

  test.describe('Authentication Flow', () => {
    test('should login and logout successfully', async ({ page }) => {
      // Test login
      await loginPage.goto();
      await loginPage.expectLoginFormVisible();
      
      await loginPage.login(TEST_USERS.admin.username, TEST_USERS.admin.password);
      await glossaryPage.expectToBeOnGlossaryPage();
      
      // Test logout
      await authHelper.logout();
      await loginPage.expectToBeOnLoginPage();
    });

    test('should handle invalid credentials', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('invalid', 'invalid');
      await loginPage.expectErrorMessage('Invalid credentials');
    });

    test('should redirect to login when not authenticated', async ({ page }) => {
      await page.goto('/glossary');
      await loginPage.expectToBeOnLoginPage();
    });
  });

  test.describe('Term Management Flow', () => {
    test.beforeEach(async ({ page }) => {
      await authHelper.loginAsAdmin();
    });

    test('should create, edit, and manage terms', async ({ page }) => {
      // Navigate to glossary
      await glossaryPage.goto();
      await glossaryPage.expectTermsVisible();

      // Search for existing term
      await glossaryPage.searchTerm('algorithm');
      await glossaryPage.expectSearchResultsVisible();

      // Click on a term to view details
      await glossaryPage.clickOnTerm('algorithm');
      await termDetailPage.expectTermDetailsVisible();

      // Enter edit mode
      await termDetailPage.clickEditButton();
      await termDetailPage.expectEditModeActive();

      // Save changes
      const newContent = 'Updated definition: ' + TEST_CONTENT.sampleDefinition;
      await termDetailPage.enterDefinition(newContent);
      await termDetailPage.clickSaveButton();
      await termDetailPage.expectEditModeInactive();
      await termDetailPage.expectDefinitionContent(newContent);
    });

    test('should search and filter terms', async ({ page }) => {
      await glossaryPage.goto();
      
      // Test search functionality
      await glossaryPage.searchTerm('data');
      await glossaryPage.expectSearchResultsVisible();
      
      // Test filter by perspective
      await glossaryPage.selectPerspective('Computer Science');
      await glossaryPage.expectFilteredResults();
      
      // Clear filters
      await glossaryPage.clearFilters();
      await glossaryPage.expectAllTermsVisible();
    });
  });

  test.describe('Review Process Flow', () => {
    test.beforeEach(async ({ page }) => {
      await authHelper.loginAsAdmin();
      // Create a test draft for review
      const termId = await fixtures.createTestTerm();
      const draftId = await fixtures.createTestDraft(termId);
      createdResources.push(`draft-${draftId}`);
    });

    test('should complete full review workflow', async ({ page }) => {
      // Navigate to review dashboard
      await reviewPage.goto();
      await reviewPage.expectReviewDashboardVisible();

      // Select a draft for review
      await reviewPage.selectDraft();
      await reviewPage.expectDraftDetailsVisible();

      // Approve the draft
      await reviewPage.clickApproveButton();
      await reviewPage.expectApprovalSuccess();

      // Publish the draft
      await reviewPage.clickPublishButton();
      await reviewPage.expectPublishSuccess();
    });

    test('should handle reviewer selection', async ({ page }) => {
      await reviewPage.goto();
      await reviewPage.selectDraft();
      
      // Request review
      await reviewPage.clickRequestReviewButton();
      await reviewPage.expectReviewerSelectorVisible();
      
      // Select reviewers
      await reviewPage.selectReviewers(['Maria Carter', 'Ben Carter']);
      await reviewPage.confirmReviewerSelection();
      await reviewPage.expectReviewRequestSuccess();
    });

    test('should search and filter drafts', async ({ page }) => {
      await reviewPage.goto();
      
      // Test search functionality
      await reviewPage.searchDrafts('test');
      await reviewPage.expectSearchResultsVisible();
      
      // Test show all toggle
      await reviewPage.toggleShowAll();
      await reviewPage.expectAllDraftsVisible();
    });
  });

  test.describe('Navigation Flow', () => {
    test.beforeEach(async ({ page }) => {
      await authHelper.loginAsAdmin();
    });

    test('should navigate between all sections', async ({ page }) => {
      // Start at glossary
      await glossaryPage.goto();
      await glossaryPage.expectToBeOnGlossaryPage();

      // Navigate to review
      await page.click('a[href="/review"]');
      await reviewPage.expectToBeOnReviewPage();

      // Navigate to my drafts
      await page.click('a[href="/my-drafts"]');
      await page.expectURL('/my-drafts');

      // Navigate back to glossary
      await page.click('a[href="/glossary"]');
      await glossaryPage.expectToBeOnGlossaryPage();
    });
  });

  test.describe('User Permissions Flow', () => {
    test('should respect user permissions for different roles', async ({ page }) => {
      // Test as perspective curator
      await authHelper.loginAsUser(TEST_USERS.mariaCarter.username, TEST_USERS.mariaCarter.password);
      
      await glossaryPage.goto();
      await glossaryPage.expectTermsVisible();
      
      // Should be able to edit terms in their perspective
      await glossaryPage.clickOnTerm('algorithm');
      await termDetailPage.expectEditButtonVisible();
      
      // Test as regular user
      await authHelper.logout();
      await authHelper.loginAsUser(TEST_USERS.regularUser.username, TEST_USERS.regularUser.password);
      
      await glossaryPage.goto();
      await glossaryPage.clickOnTerm('algorithm');
      // Should not see edit button for terms they can't edit
      await termDetailPage.expectEditButtonNotVisible();
    });
  });

  test.describe('Error Handling Flow', () => {
    test.beforeEach(async ({ page }) => {
      await authHelper.loginAsAdmin();
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network error
      await page.route('**/api/**', route => route.abort());
      
      await glossaryPage.goto();
      await glossaryPage.expectErrorMessage('Failed to load terms');
      
      // Restore network
      await page.unroute('**/api/**');
      
      // Should work normally after network restoration
      await glossaryPage.goto();
      await glossaryPage.expectTermsVisible();
    });
  });
});
