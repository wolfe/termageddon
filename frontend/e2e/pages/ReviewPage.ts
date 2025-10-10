import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class ReviewPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Locators
  get searchInput() {
    return this.getByTestId('review-search-input');
  }

  get showAllCheckbox() {
    return this.page.locator('input[type="checkbox"][id="showAll"]');
  }

  get draftItems() {
    return this.page.locator('[data-testid="draft-item"]');
  }

  get selectedDraft() {
    return this.page.locator('[data-testid="draft-item"].bg-termageddon-gray-light');
  }

  get approveButton() {
    return this.getByTestId('approve-button');
  }

  get publishButton() {
    return this.getByTestId('publish-button');
  }

  get requestReviewButton() {
    return this.page.locator('button:has-text("Request Review")');
  }

  get draftTitle() {
    return this.page.locator('h1.text-xl.font-bold').first();
  }

  get draftContent() {
    return this.page.locator('.prose.prose-sm.max-w-none.bg-gray-50');
  }

  get perspectiveBadge() {
    return this.page.locator('.bg-termageddon-blue.text-white').first();
  }

  get officialBadge() {
    return this.page.locator('.bg-yellow-400.text-black');
  }

  get approvalStatusBadge() {
    return this.page.locator('.bg-orange-100.text-orange-700, .bg-green-100.text-green-700');
  }

  get authorInfo() {
    return this.page.locator('text=Author Information:');
  }

  get currentApprovals() {
    return this.page.locator('text=Current Approvals:');
  }

  get approversList() {
    return this.page.locator('.w-6.h-6.rounded-full.bg-green-500');
  }

  get loadingIndicator() {
    return this.page.locator('.animate-spin.rounded-full');
  }

  get errorMessage() {
    return this.page.locator('.text-orange-600').first();
  }

  get retryButton() {
    return this.page.locator('button:has-text("Retry")');
  }

  get noPendingMessage() {
    return this.page.locator('text=No pending reviews found');
  }

  get noMatchesMessage() {
    return this.page.locator('text=No matches found');
  }

  get selectDraftMessage() {
    return this.page.locator('text=Select a definition to review');
  }

  get eligibilityIndicators() {
    // Look for the eligibility text spans in draft items
    return this.page.locator('[data-testid="draft-item"] .px-2.py-0\\.5.text-xs.rounded.font-medium');
  }

  get approvalCounts() {
    return this.page.locator('[data-testid="draft-item"] .text-orange-600.text-xs');
  }

  get alreadyApprovedText() {
    return this.page.locator('text=✓ Approved by you');
  }

  get cannotApproveText() {
    return this.page.locator('text=Cannot approve own').first();
  }

  get clickToReviewText() {
    return this.page.locator('text=Click to review');
  }

  async expectToBeOnReviewPage() {
    await expect(this.page).toHaveURL(/.*\/review.*/);
    await this.expectSearchInputVisible();
  }

  async expectSearchInputVisible() {
    await this.expectVisibleByTestId('review-search-input');
  }

  async search(term: string) {
    await this.searchInput.fill(term);
    await this.waitForElementHidden('.animate-spin');
  }

  async clearSearch() {
    await this.searchInput.fill('');
    await this.waitForElementHidden('.animate-spin');
  }

  async toggleShowAll() {
    await this.showAllCheckbox.click();
    await this.waitForElementHidden('.animate-spin');
  }

  async selectDraft(draftIndex: number = 0) {
    const draftItem = this.draftItems.nth(draftIndex);
    await draftItem.click();
    await this.waitForNavigation();
  }

  async selectDraftByTerm(termName: string) {
    const draftItem = this.page.locator(`[data-testid="draft-item"]:has-text("${termName}")`);
    await draftItem.click();
    await this.waitForNavigation();
  }

  async approveDraft() {
    await this.approveButton.click();
    await this.waitForNavigation();
  }

  async publishDraft() {
    await this.publishButton.click();
    await this.waitForNavigation();
  }

  async requestReview() {
    await this.requestReviewButton.click();
    await this.waitForNavigation();
  }

  async retry() {
    await this.retryButton.click();
    await this.waitForElementHidden('.animate-spin');
  }

  // Assertions
  async expectSearchInputVisible() {
    await this.expectVisibleByTestId('review-search-input');
  }

  async expectShowAllCheckboxVisible() {
    await expect(this.showAllCheckbox).toBeVisible();
  }

  async expectDraftItemVisible(termName: string) {
    await expect(this.page.locator(`[data-testid="draft-item"]:has-text("${termName}")`)).toBeVisible();
  }

  async expectDraftItemNotVisible(termName: string) {
    await expect(this.page.locator(`[data-testid="draft-item"]:has-text("${termName}")`)).toBeHidden();
  }

  async expectDraftSelected(termName: string) {
    const draftItem = this.page.locator(`[data-testid="draft-item"]:has-text("${termName}")`);
    const classes = await draftItem.getAttribute('class');
    expect(classes).toContain('bg-termageddon-gray-light');
  }

  async expectApproveButtonVisible() {
    await this.expectVisibleByTestId('approve-button');
  }

  async expectApproveButtonHidden() {
    await this.expectHiddenByTestId('approve-button');
  }

  async expectPublishButtonVisible() {
    await this.expectVisibleByTestId('publish-button');
  }

  async expectPublishButtonHidden() {
    await this.expectHiddenByTestId('publish-button');
  }

  async expectRequestReviewButtonVisible() {
    await expect(this.requestReviewButton).toBeVisible();
  }

  async expectRequestReviewButtonHidden() {
    await expect(this.requestReviewButton).toBeHidden();
  }

  async expectDraftTitle(termName: string) {
    await expect(this.draftTitle).toHaveText(termName);
  }

  async expectDraftContentVisible() {
    await expect(this.draftContent).toBeVisible();
  }

  async expectPerspectiveBadge(perspectiveName: string) {
    await expect(this.perspectiveBadge).toContainText(perspectiveName);
  }

  async expectOfficialBadge() {
    await expect(this.officialBadge).toBeVisible();
  }

  async expectNoOfficialBadge() {
    await expect(this.officialBadge).toBeHidden();
  }

  async expectApprovalStatus(approvalCount: number) {
    await expect(this.approvalStatusBadge).toContainText(`${approvalCount}/2 Approvals`);
  }

  async expectAuthorInfoVisible() {
    await expect(this.authorInfo).toBeVisible();
  }

  async expectCurrentApprovalsVisible() {
    await expect(this.currentApprovals).toBeVisible();
  }

  async expectApproversVisible() {
    await expect(this.approversList.first()).toBeVisible();
  }

  async expectLoadingIndicator() {
    await expect(this.loadingIndicator).toBeVisible();
  }

  async expectNoLoadingIndicator() {
    await expect(this.loadingIndicator).toBeHidden();
  }

  async expectErrorMessage(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }

  async expectNoPendingMessage() {
    await expect(this.noPendingMessage).toBeVisible();
  }

  async expectNoMatchesMessage(searchTerm: string) {
    await expect(this.noMatchesMessage).toContainText(`No matches found for "${searchTerm}"`);
  }

  async expectSelectDraftMessage() {
    await expect(this.selectDraftMessage).toBeVisible();
  }

  async expectEligibilityStatus(status: string) {
    await expect(this.eligibilityIndicators).toContainText(status);
  }

  async expectApprovalCount(count: number) {
    await expect(this.approvalCounts).toContainText(`${count}/2 Approvals`);
  }

  async expectAlreadyApproved() {
    await expect(this.alreadyApprovedText).toBeVisible();
  }

  async expectCannotApproveOwn() {
    await expect(this.cannotApproveText).toBeVisible();
  }

  async expectClickToReview() {
    await expect(this.clickToReviewText).toBeVisible();
  }

  // Utility methods
  async getDraftCount() {
    return await this.draftItems.count();
  }

  async getDraftTitles() {
    const items = await this.draftItems.all();
    return Promise.all(items.map(async (item) => {
      const title = await item.locator('h3').textContent();
      return title || '';
    }));
  }

  async getEligibilityStatuses() {
    const indicators = await this.eligibilityIndicators.all();
    return Promise.all(indicators.map(indicator => indicator.textContent()));
  }

  async getApprovalCount() {
    const counts = await this.approvalCounts.all();
    if (counts.length > 0) {
      const firstCount = await counts[0].textContent();
      return parseInt(firstCount || '0', 10);
    }
    return 0;
  }

  async getApprovalCounts() {
    const counts = await this.approvalCounts.all();
    return Promise.all(counts.map(count => count.textContent()));
  }

  async isDraftEligible(termName: string) {
    const draftItem = this.page.locator(`[data-testid="draft-item"]:has-text("${termName}")`).first();
    const classes = await draftItem.getAttribute('class');
    return !classes?.includes('opacity-60');
  }

  async hasDraftBeenApproved(termName: string) {
    const draftItem = this.page.locator(`[data-testid="draft-item"]:has-text("${termName}")`).first();
    return await draftItem.locator('text=✓ Approved by you').isVisible();
  }

  async isOwnDraft(termName: string) {
    const draftItem = this.page.locator(`[data-testid="draft-item"]:has-text("${termName}")`).first();
    const classes = await draftItem.getAttribute('class');
    return classes?.includes('opacity-60') || false;
  }

  async waitForDraftsToLoad() {
    // Wait for drafts to load with a simpler approach
    await this.page.waitForFunction(() => {
      const drafts = document.querySelectorAll('[data-testid="draft-item"]');
      return drafts.length > 0;
    }, { timeout: 10000 });
  }

  async getSelectedDraftTitle() {
    return await this.draftTitle.textContent();
  }

  async getSelectedDraftContent() {
    return await this.draftContent.textContent();
  }
}
