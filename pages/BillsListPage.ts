import { Page, Locator } from '@playwright/test';

/**
 * Locators here are best-effort, role/label-based guesses (the AUT could not be
 * reached from the environment this suite was authored in — outbound network
 * access was blocked by sandbox policy). If the real DOM uses different
 * labels/roles, adjust the getters below; every test consumes them, so a
 * single edit here propagates everywhere.
 */
export class BillsListPage {
  readonly page: Page;
  readonly newBillButton: Locator;
  readonly searchInput: Locator;
  readonly table: Locator;
  readonly noResultsMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newBillButton = page.getByRole('button', { name: /new bill|create bill|add bill/i });
    this.searchInput = page.getByPlaceholder(/search/i);
    this.table = page.getByRole('table');
    this.noResultsMessage = page.getByText(/no (bills|results|records) found/i);
  }

  async goto() {
    await this.page.goto('/accounts-payable');
    await this.table.waitFor({ state: 'visible' });
  }

  rowByBillNumber(billNumber: string): Locator {
    return this.table.getByRole('row', { name: new RegExp(billNumber) });
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
  }

  async openBill(billNumber: string) {
    await this.rowByBillNumber(billNumber).click();
  }

  async openNewBillForm() {
    await this.newBillButton.click();
  }

  async getTotalForRow(billNumber: string): Promise<string> {
    const cells = this.rowByBillNumber(billNumber).getByRole('cell');
    return (await cells.last().innerText()).trim();
  }

  async deleteBill(billNumber: string) {
    await this.rowByBillNumber(billNumber)
      .getByRole('button', { name: /delete|remove/i })
      .click();
  }

  /** True once the current view shows zero matching rows (via empty table or an empty-state message). */
  async hasNoResults(): Promise<boolean> {
    const rowCount = await this.table.getByRole('row').count();
    const emptyStateVisible = await this.noResultsMessage.isVisible().catch(() => false);
    return rowCount === 0 || emptyStateVisible;
  }
}
