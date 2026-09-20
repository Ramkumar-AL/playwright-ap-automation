import { Page, Locator, expect } from '@playwright/test';

/**
 * Locators verified against the real Purchases list
 * (https://app.aiaccountant.com/accounts-payable) via Playwright codegen and
 * DevTools inspection. The table uses
 * data-testid="ap-table-row-{rowIndex}-cell-{colIndex}"; cell index 3 is the
 * clickable cell that opens a bill. The row's "..." actions button
 * (data-testid="ap-button-Option", cell index 8) only renders on hover,
 * which Playwright's click can't reliably trigger — deletion instead goes
 * through the always-visible trash icon on the bill's own details page
 * (data-testid="bill-button-delete"). Clicking it deletes immediately;
 * there is no confirm/cancel dialog either way.
 */
export class BillsListPage {
  readonly page: Page;
  readonly newBillButton: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newBillButton = page.getByRole('button', { name: /create bill/i });
    this.searchInput = page.getByTestId('filter-search-input');
  }

  async goto() {
    await this.page.goto('/accounts-payable');
    await this.searchInput.waitFor({ state: 'visible' });
  }

  async openNewBillForm() {
    await this.newBillButton.click();
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    // The table goes through transient states right after typing — briefly
    // empty mid-debounce, or still showing the previous search's stale row —
    // either of which can look like a final result if checked only once.
    // Poll for a real match first; only accept "no results" once it holds
    // true across a short re-check, to rule out a mid-debounce false positive.
    await expect
      .poll(
        async () => {
          const text = await this.rowText(0).catch(() => '');
          if (text.includes(query)) return true;
          if (!(await this.hasNoResults())) return false;
          await this.page.waitForTimeout(500);
          return this.hasNoResults();
        },
        { timeout: 15_000 }
      )
      .toBe(true);
  }

  rowOpenCell(rowIndex = 0): Locator {
    return this.page.getByTestId(`ap-table-row-${rowIndex}-cell-3`);
  }

  rowLocator(rowIndex = 0): Locator {
    return this.rowOpenCell(rowIndex).locator('xpath=ancestor::tr');
  }

  async openBillAtRow(rowIndex = 0) {
    await this.rowOpenCell(rowIndex).click();
  }

  /** Opens a bill's read-only details page, then its actual editable form (a separate route). */
  async openEditFormAtRow(rowIndex = 0) {
    await this.openBillAtRow(rowIndex);
    await this.page.getByTestId('bill-button-edit').click();
  }

  /** Deletes a bill from its own details page (the reliable path — the list's hover-only "..." menu is not). */
  async deleteBillAtRow(rowIndex = 0) {
    await this.openBillAtRow(rowIndex);
    await this.page.getByTestId('bill-button-delete').click();
  }

  async rowText(rowIndex = 0): Promise<string> {
    return (await this.rowLocator(rowIndex).innerText()).trim();
  }

  async hasNoResults(): Promise<boolean> {
    return (await this.rowOpenCell(0).count()) === 0;
  }
}
