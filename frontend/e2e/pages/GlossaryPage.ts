import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class GlossaryPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Locators
  get searchInput() {
    return this.getByTestId('term-search-input');
  }

  get domainFilter() {
    return this.getByTestId('domain-filter-select');
  }

  get createTermButton() {
    return this.page.locator('button:has-text("+ Create Term")');
  }

  get clearFiltersButton() {
    return this.page.locator('button:has-text("Clear Filters")');
  }

  get termNames() {
    return this.page.locator('[data-testid="term-name"]');
  }

  get domainBubbles() {
    return this.page.locator('[data-testid="domain-bubble"]');
  }

  get endorsedBadges() {
    return this.page.locator('.bg-green-400.text-black');
  }

  get loadingIndicator() {
    return this.page.locator('text=Loading...');
  }

  get noEntriesMessage() {
    return this.page.locator('text=No entries found');
  }

  // Actions
  async goto() {
    await this.page.goto('/');
    await this.waitForNavigation();
  }

  async search(term: string) {
    await this.searchInput.fill(term);
    // Wait for search to complete by checking if clear button appears
    await this.page.waitForSelector('[data-testid="term-search-input"] + button', { state: 'visible', timeout: 5000 }).catch(() => {
      // Clear button might not appear if search is empty
    });
  }

  async clearSearch() {
    await this.searchInput.fill('');
  }

  async selectDomain(domainName: string) {
    await this.domainFilter.selectOption({ label: domainName });
    await this.waitForNavigation();
  }

  async selectAllDomains() {
    await this.domainFilter.selectOption('');
    await this.waitForNavigation();
  }

  async clickTerm(termName: string) {
    const termElement = this.page.locator(`[data-testid="term-name"]:has-text("${termName}")`).first();
    await termElement.click();
    await this.waitForNavigation();
  }

  async clickDomainBubble(domainName: string) {
    const domainElement = this.page.locator(`[data-testid="domain-bubble"]:has-text("${domainName}")`).first();
    await domainElement.click();
    await this.waitForNavigation();
  }

  async clickCreateTerm() {
    await this.createTermButton.click();
    await this.waitForNavigation();
  }

  async clearFilters() {
    if (await this.clearFiltersButton.isVisible()) {
      await this.clearFiltersButton.click();
      await this.waitForNavigation();
    }
  }

  // Assertions
  async expectSearchInputVisible() {
    await this.expectVisibleByTestId('term-search-input');
  }

  async expectDomainFilterVisible() {
    await this.expectVisibleByTestId('domain-filter-select');
  }

  async expectTermVisible(termName: string) {
    await expect(this.page.locator(`[data-testid="term-name"]:has-text("${termName}")`)).toBeVisible();
  }

  async expectTermNotVisible(termName: string) {
    await expect(this.page.locator(`[data-testid="term-name"]:has-text("${termName}")`)).toBeHidden();
  }

  async expectDomainBubbleVisible(domainName: string) {
    await expect(this.page.locator(`[data-testid="domain-bubble"]:has-text("${domainName}")`)).toBeVisible();
  }

  async expectEndorsedBadgeVisible(termName: string) {
    const termRow = this.page.locator(`[data-testid="term-name"]:has-text("${termName}")`).locator('..');
    await expect(termRow.locator('.bg-green-400.text-black')).toBeVisible();
  }

  async expectNoEndorsedBadge(termName: string) {
    const termRow = this.page.locator(`[data-testid="term-name"]:has-text("${termName}")`).locator('..');
    await expect(termRow.locator('.bg-green-400.text-black')).toBeHidden();
  }

  async expectLoadingIndicator() {
    await expect(this.loadingIndicator).toBeVisible();
  }

  async expectNoLoadingIndicator() {
    await expect(this.loadingIndicator).toBeHidden();
  }

  async expectNoEntriesMessage() {
    await expect(this.noEntriesMessage).toBeVisible();
  }

  async expectTermCount(count: number) {
    await expect(this.termNames).toHaveCount(count);
  }

  // Utility methods
  async getTermCount() {
    return await this.termNames.count();
  }

  async getTermNames() {
    const elements = await this.termNames.all();
    return Promise.all(elements.map(el => el.textContent()));
  }

  async getDomainNames() {
    const elements = await this.domainBubbles.all();
    return Promise.all(elements.map(el => el.textContent()));
  }

  async waitForTermsToLoad() {
    // Wait for terms to load with a simpler approach
    await this.page.waitForFunction(() => {
      const terms = document.querySelectorAll('[data-testid="term-name"]');
      return terms.length > 0;
    }, { timeout: 10000 });
  }

  async isTermSelected(termName: string) {
    const termElement = this.page.locator(`[data-testid="term-name"]:has-text("${termName}")`);
    const classes = await termElement.getAttribute('class');
    return classes?.includes('bg-termageddon-gray-light') || false;
  }

  async isDomainSelected(domainName: string) {
    const domainElement = this.page.locator(`[data-testid="domain-bubble"]:has-text("${domainName}")`);
    const classes = await domainElement.getAttribute('class');
    return classes?.includes('bg-termageddon-blue') || false;
  }
}
