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

  get versionItems() {
    return this.page.locator('[data-testid="version-item"]');
  }

  get selectedVersion() {
    return this.page.locator('[data-testid="version-item"].bg-termageddon-gray-light');
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

  get versionTitle() {
    return this.page.locator('h1.text-xl.font-bold').first();
  }

  get versionContent() {
    return this.page.locator('.prose.prose-sm.max-w-none.bg-gray-50');
  }

  get domainBadge() {
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

  get selectVersionMessage() {
    return this.page.locator('text=Select a definition to review');
  }

  get eligibilityIndicators() {
    return this.page.locator('.px-2\\.py-0\\.5\\.text-xs\\.rounded\\.font-medium');
  }

  get approvalCounts() {
    return this.page.locator('.text-orange-600.text-xs');
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

  // Actions
  async goto() {
    await this.page.goto('/review');
    await this.waitForNavigation();
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

  async selectVersion(versionIndex: number = 0) {
    const versionItem = this.versionItems.nth(versionIndex);
    await versionItem.click();
    await this.waitForNavigation();
  }

  async selectVersionByTerm(termName: string) {
    const versionItem = this.page.locator(`[data-testid="version-item"]:has-text("${termName}")`);
    await versionItem.click();
    await this.waitForNavigation();
  }

  async approveVersion() {
    await this.approveButton.click();
    await this.waitForNavigation();
  }

  async publishVersion() {
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

  async expectVersionItemVisible(termName: string) {
    await expect(this.page.locator(`[data-testid="version-item"]:has-text("${termName}")`)).toBeVisible();
  }

  async expectVersionItemNotVisible(termName: string) {
    await expect(this.page.locator(`[data-testid="version-item"]:has-text("${termName}")`)).toBeHidden();
  }

  async expectVersionSelected(termName: string) {
    const versionItem = this.page.locator(`[data-testid="version-item"]:has-text("${termName}")`);
    const classes = await versionItem.getAttribute('class');
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

  async expectVersionTitle(termName: string) {
    await expect(this.versionTitle).toHaveText(termName);
  }

  async expectVersionContentVisible() {
    await expect(this.versionContent).toBeVisible();
  }

  async expectDomainBadge(domainName: string) {
    await expect(this.domainBadge).toContainText(domainName);
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

  async expectSelectVersionMessage() {
    await expect(this.selectVersionMessage).toBeVisible();
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
  async getVersionCount() {
    return await this.versionItems.count();
  }

  async getVersionTitles() {
    const items = await this.versionItems.all();
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

  async isVersionEligible(termName: string) {
    const versionItem = this.page.locator(`[data-testid="version-item"]:has-text("${termName}")`).first();
    const classes = await versionItem.getAttribute('class');
    return !classes?.includes('opacity-60');
  }

  async hasVersionBeenApproved(termName: string) {
    const versionItem = this.page.locator(`[data-testid="version-item"]:has-text("${termName}")`).first();
    return await versionItem.locator('text=✓ Approved by you').isVisible();
  }

  async isOwnVersion(termName: string) {
    const versionItem = this.page.locator(`[data-testid="version-item"]:has-text("${termName}")`).first();
    const classes = await versionItem.getAttribute('class');
    return classes?.includes('opacity-60') || false;
  }

  async waitForVersionsToLoad() {
    // Wait for versions to load with a simpler approach
    await this.page.waitForFunction(() => {
      const versions = document.querySelectorAll('[data-testid="version-item"]');
      return versions.length > 0;
    }, { timeout: 10000 });
  }

  async getSelectedVersionTitle() {
    return await this.versionTitle.textContent();
  }

  async getSelectedVersionContent() {
    return await this.versionContent.textContent();
  }
}
