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
 *
 * This is a shared, actively-used account with 1700+ bills, and search
 * matches broadly (any partial substring — see AP-083/084). A query can
 * legitimately return more than one row, so every lookup here searches
 * across the visible rows for the exact bill number rather than assuming
 * it's always row 0.
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
    // empty mid-debounce, or still showing the previous search's stale rows —
    // either of which can look like a final result if checked only once.
    // Poll for a real match first; only accept "no results" once it holds
    // true across a short re-check, to rule out a mid-debounce false positive.
    await expect
      .poll(
        async () => {
          if ((await this.findRowIndex(query)) !== null) return true;
          if (!(await this.hasNoResults())) return false;
          await this.page.waitForTimeout(500);
          return this.hasNoResults();
        },
        { timeout: 15_000 }
      )
      .toBe(true);
  }

  /** Scans the visible rows (current page) for one whose text contains the given substring. */
  async findRowIndex(text: string, maxRows = 10): Promise<number | null> {
    for (let i = 0; i < maxRows; i++) {
      if ((await this.rowOpenCell(i).count()) === 0) break;
      const rowText = await this.rowLocator(i).innerText().catch(() => '');
      if (rowText.includes(text)) return i;
    }
    return null;
  }

  rowOpenCell(rowIndex = 0): Locator {
    return this.page.getByTestId(`ap-table-row-${rowIndex}-cell-3`);
  }

  rowLocator(rowIndex = 0): Locator {
    return this.rowOpenCell(rowIndex).locator('xpath=ancestor::tr');
  }

  async openBillAtRow(rowIndex = 0) {
    // The click can occasionally get swallowed by an in-flight re-render
    // right after a search settles — retry a couple of times before giving up.
    for (let attempt = 1; attempt <= 3; attempt++) {
      await this.rowOpenCell(rowIndex).click();
      try {
        await this.page.waitForURL(/\/accounts-payable\/bill\//, { timeout: 5000 });
        return;
      } catch {
        if (attempt === 3) throw new Error(`openBillAtRow(${rowIndex}): never navigated to a bill's details page`);
      }
    }
  }

  /** Finds the row matching billNumber and opens its details page. */
  async openBillByNumber(billNumber: string) {
    const rowIndex = await this.findRowIndex(billNumber);
    if (rowIndex === null) throw new Error(`No row found matching "${billNumber}"`);
    await this.openBillAtRow(rowIndex);
  }

  /** Opens a bill's read-only details page, then its actual editable form (a separate route). */
  async openEditFormByNumber(billNumber: string) {
    await this.openBillByNumber(billNumber);
    await this.page.getByTestId('bill-button-edit').click();
  }

  /** Deletes a bill from its own details page (the reliable path — the list's hover-only "..." menu is not). */
  async deleteBillByNumber(billNumber: string) {
    await this.openBillByNumber(billNumber);
    await this.page.getByTestId('bill-button-delete').click();
  }

  async rowText(rowIndex = 0): Promise<string> {
    return (await this.rowLocator(rowIndex).innerText()).trim();
  }

  async rowTextForBillNumber(billNumber: string): Promise<string> {
    const rowIndex = await this.findRowIndex(billNumber);
    if (rowIndex === null) throw new Error(`No row found matching "${billNumber}"`);
    return this.rowText(rowIndex);
  }

  async hasNoResults(): Promise<boolean> {
    return (await this.rowOpenCell(0).count()) === 0;
  }
}
