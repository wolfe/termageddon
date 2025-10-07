import { Page, expect } from '@playwright/test';

export class BasePage {
  constructor(protected page: Page) {}

  /**
   * Wait for an element to be visible and stable
   */
  async waitForElement(selector: string, timeout = 10000) {
    await this.page.waitForSelector(selector, { state: 'visible', timeout });
  }

  /**
   * Wait for an element to be hidden
   */
  async waitForElementHidden(selector: string, timeout = 10000) {
    await this.page.waitForSelector(selector, { state: 'hidden', timeout });
  }

  /**
   * Wait for a condition to be true
   */
  async waitForCondition(condition: () => Promise<boolean>, timeout = 10000) {
    await this.page.waitForFunction(condition, { timeout });
  }

  /**
   * Wait for navigation to complete
   */
  async waitForNavigation() {
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
      // If networkidle times out, just wait for domcontentloaded
      return this.page.waitForLoadState('domcontentloaded', { timeout: 5000 });
    });
  }

  /**
   * Wait for a specific URL
   */
  async waitForUrl(url: string | RegExp, timeout = 10000) {
    await this.page.waitForURL(url, { timeout });
  }

  /**
   * Get element by test ID
   */
  getByTestId(testId: string) {
    return this.page.getByTestId(testId);
  }

  /**
   * Click element by test ID
   */
  async clickByTestId(testId: string) {
    await this.getByTestId(testId).click();
  }

  /**
   * Fill input by test ID
   */
  async fillByTestId(testId: string, value: string) {
    await this.getByTestId(testId).fill(value);
  }

  /**
   * Check if element is visible by test ID
   */
  async isVisibleByTestId(testId: string) {
    return await this.getByTestId(testId).isVisible();
  }

  /**
   * Wait for element to be visible by test ID
   */
  async waitForVisibleByTestId(testId: string, timeout = 10000) {
    await this.getByTestId(testId).waitFor({ state: 'visible', timeout });
  }

  /**
   * Wait for element to be hidden by test ID
   */
  async waitForHiddenByTestId(testId: string, timeout = 10000) {
    await this.getByTestId(testId).waitFor({ state: 'hidden', timeout });
  }

  /**
   * Get text content by test ID
   */
  async getTextByTestId(testId: string) {
    return await this.getByTestId(testId).textContent();
  }

  /**
   * Assert element is visible by test ID
   */
  async expectVisibleByTestId(testId: string) {
    await expect(this.getByTestId(testId)).toBeVisible();
  }

  /**
   * Assert element is hidden by test ID
   */
  async expectHiddenByTestId(testId: string) {
    await expect(this.getByTestId(testId)).toBeHidden();
  }

  /**
   * Assert element contains text by test ID
   */
  async expectTextByTestId(testId: string, text: string | RegExp) {
    await expect(this.getByTestId(testId)).toContainText(text);
  }

  /**
   * Navigate to a specific URL
   */
  async goto(url: string) {
    await this.page.goto(url);
    await this.waitForNavigation();
  }

  /**
   * Get current URL
   */
  getCurrentUrl() {
    return this.page.url();
  }

  /**
   * Take a screenshot
   */
  async screenshot(path: string) {
    await this.page.screenshot({ path });
  }

  /**
   * Wait for a specific amount of time (use sparingly)
   */
  async wait(ms: number) {
    await this.page.waitForTimeout(ms);
  }
}
