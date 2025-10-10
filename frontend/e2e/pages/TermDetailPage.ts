import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class TermDetailPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Locators
  get termTitle() {
    return this.page.locator('h1.text-2xl.font-bold');
  }

  get editButton() {
    return this.getByTestId('term-edit-button');
  }

  get endorseButton() {
    return this.getByTestId('term-endorse-button');
  }

  get saveButton() {
    return this.getByTestId('term-save-button');
  }

  get cancelButton() {
    return this.getByTestId('term-cancel-button');
  }

  get contentArea() {
    return this.getByTestId('term-content');
  }

  get definitionForm() {
    return this.page.locator('app-definition-form');
  }

  get perspectiveTabs() {
    return this.page.locator('.px-3.py-1.text-sm.rounded-t');
  }

  get approvedBadge() {
    return this.page.locator('.bg-green-100.text-green-700').first();
  }

  get pendingApprovalBadge() {
    return this.page.locator('.bg-orange-100.text-orange-700');
  }

  get endorsedBadge() {
    return this.page.locator('.bg-green-400.text-black').first();
  }

  get approversList() {
    return this.page.locator('.w-8.h-8.rounded-full.bg-termageddon-blue');
  }

  get endorserInfo() {
    return this.page.locator('.w-8.h-8.rounded-full.bg-green-600');
  }

  get authorInfo() {
    return this.page.locator('text=Author:');
  }

  get lastUpdatedInfo() {
    return this.page.locator('text=Last Updated:');
  }

  get commentsSection() {
    return this.page.locator('h3:has-text("Comments")');
  }

  get noDefinitionMessage() {
    return this.page.locator('text=No approved definition available');
  }

  // Actions
  async clickEdit() {
    await this.editButton.click();
    await this.waitForElement('app-definition-form');
  }

  async clickEndorse() {
    await this.endorseButton.click();
    await this.waitForNavigation();
  }

  async clickSave() {
    await this.saveButton.click();
    await this.waitForSaveComplete();
  }

  async clickCancel() {
    await this.cancelButton.click();
    await this.waitForElementHidden('app-definition-form');
  }

  async editDefinition(content: string) {
    await this.clickEdit();
    await this.fillDefinition(content);
    await this.clickSave();
  }

  async fillDefinition(content: string) {
    // The definition form is a custom component, so we'll use a more generic approach
    const textarea = this.page.locator('textarea, [contenteditable="true"]').first();
    await textarea.fill(content);
  }

  async switchToPerspective(perspectiveName: string) {
    const perspectiveTab = this.page.locator(`button:has-text("${perspectiveName}")`);
    await perspectiveTab.click();
    await this.waitForNavigation();
  }

  async waitForSaveComplete() {
    // Wait for edit button to be visible again (indicating save is complete)
    await this.expectVisibleByTestId('term-edit-button');
  }

  // Assertions
  async expectTermTitle(termName: string) {
    await expect(this.termTitle).toHaveText(termName);
  }

  async expectEditButtonVisible() {
    await this.expectVisibleByTestId('term-edit-button');
  }

  async expectEditButtonHidden() {
    await this.expectHiddenByTestId('term-edit-button');
  }

  async expectEndorseButtonVisible() {
    await this.expectVisibleByTestId('term-endorse-button');
  }

  async expectEndorseButtonHidden() {
    await this.expectHiddenByTestId('term-endorse-button');
  }

  async expectEndorseButtonDisabled() {
    await expect(this.endorseButton).toBeDisabled();
  }

  async expectEndorseButtonEnabled() {
    await expect(this.endorseButton).toBeEnabled();
  }

  async expectSaveButtonVisible() {
    await this.expectVisibleByTestId('term-save-button');
  }

  async expectCancelButtonVisible() {
    await this.expectVisibleByTestId('term-cancel-button');
  }

  async expectDefinitionFormVisible() {
    await expect(this.definitionForm).toBeVisible();
  }

  async expectDefinitionFormHidden() {
    await expect(this.definitionForm).toBeHidden();
  }

  async expectContentVisible() {
    await this.expectVisibleByTestId('term-content');
  }

  async expectContentText(text: string | RegExp) {
    await expect(this.contentArea).toContainText(text);
  }

  async expectApprovedBadge() {
    await expect(this.approvedBadge).toBeVisible();
  }

  async expectPendingApprovalBadge() {
    await expect(this.pendingApprovalBadge).toBeVisible();
  }

  async expectEndorsedBadge() {
    await expect(this.endorsedBadge).toBeVisible();
  }

  async expectNoEndorsedBadge() {
    await expect(this.endorsedBadge).toBeHidden();
  }

  async expectApprovalCount(count: number) {
    await expect(this.page.locator(`text=${count}/2 Approvals`)).toBeVisible();
  }

  async expectApproversVisible() {
    await expect(this.approversList.first()).toBeVisible();
  }

  async expectEndorserVisible() {
    await expect(this.endorserInfo).toBeVisible();
  }

  async expectAuthorInfoVisible() {
    await expect(this.authorInfo).toBeVisible();
  }

  async expectLastUpdatedVisible() {
    await expect(this.lastUpdatedInfo).toBeVisible();
  }

  async expectCommentsSectionVisible() {
    await expect(this.commentsSection).toBeVisible();
  }

  async expectNoDefinitionMessage() {
    await expect(this.noDefinitionMessage).toBeVisible();
  }

  async expectPerspectiveTabVisible(perspectiveName: string) {
    await expect(this.page.locator(`button:has-text("${perspectiveName}")`)).toBeVisible();
  }

  async expectPerspectiveTabActive(perspectiveName: string) {
    const perspectiveTab = this.page.locator(`button:has-text("${perspectiveName}")`);
    const classes = await perspectiveTab.getAttribute('class');
    expect(classes).toContain('bg-green-100');
  }

  // Utility methods
  async isInEditMode() {
    return await this.definitionForm.isVisible();
  }

  async getApprovalCount() {
    const badge = this.page.locator('.bg-orange-100.text-orange-700, .bg-green-100.text-green-700');
    const text = await badge.textContent();
    const match = text?.match(/(\d+)\/2/);
    return match ? parseInt(match[1]) : 0;
  }

  async getApproverNames() {
    const approvers = await this.approversList.all();
    return Promise.all(approvers.map(async (approver) => {
      const title = await approver.getAttribute('title');
      return title || '';
    }));
  }

  async getEndorserName() {
    const endorser = this.endorserInfo.first();
    const title = await endorser.getAttribute('title');
    return title || '';
  }

  async getAuthorName() {
    const authorText = await this.authorInfo.textContent();
    return authorText?.replace('Author:', '').trim() || '';
  }

  async getLastUpdated() {
    const updatedText = await this.lastUpdatedInfo.textContent();
    return updatedText?.replace('Last Updated:', '').trim() || '';
  }

  async getDefinitionContent() {
    return await this.contentArea.textContent();
  }

  async hasMultiplePerspectives() {
    const perspectiveTabs = await this.perspectiveTabs.count();
    return perspectiveTabs > 1;
  }

  async getPerspectiveNames() {
    const tabs = await this.perspectiveTabs.all();
    return Promise.all(tabs.map(tab => tab.textContent()));
  }
}
