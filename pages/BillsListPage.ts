import { Page, Locator } from '@playwright/test';

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
 * legitimately return more than one row, and the table can flicker through
 * more than one loading/transient state after typing (observed: it can
 * settle on a match, then briefly reload again before a subsequent action
 * runs). findRowIndex() is the single source of truth for "is this bill in
 * the current results" and retries internally through that flakiness, so
 * every caller — search() included — gets the same resilience for free
 * instead of each one needing its own retry wrapper.
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

  /**
   * Settles a search and returns the matching row index, or null if genuinely
   * none exists. Callers checking "is this bill (still/now) in the results"
   * should use this return value directly rather than calling findRowIndex()
   * again afterward — a second, separate lookup re-opens the same window for
   * a transient re-render to be caught mid-flight that search() itself just
   * spent up to 15s ruling out.
   */
  async search(query: string): Promise<number | null> {
    await this.searchInput.fill(query);
    return this.findRowIndex(query, { timeout: 15_000 });
  }

  /**
   * Scans the visible rows (current page) for one whose text contains the
   * given substring, retrying for up to `timeout` since the table can
   * flicker through loading/stale states after a search. Returns null once
   * that whole window has elapsed with no match — a genuine "not found".
   */
  async findRowIndex(text: string, options: { maxRows?: number; timeout?: number } = {}): Promise<number | null> {
    const { maxRows = 10, timeout = 8000 } = options;
    const deadline = Date.now() + timeout;
    for (;;) {
      for (let i = 0; i < maxRows; i++) {
        if ((await this.rowOpenCell(i).count()) === 0) break;
        const rowText = await this.rowLocator(i).innerText().catch(() => '');
        if (rowText.includes(text)) return i;
      }
      if (Date.now() > deadline) return null;
      await this.page.waitForTimeout(300);
    }
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

  /**
   * Finds the row matching billNumber and opens its details page. Pass the
   * index already returned by search() as `knownRowIndex` to skip a second,
   * separate lookup (which would re-open the same window for a transient
   * re-render to be caught mid-flight).
   */
  async openBillByNumber(billNumber: string, knownRowIndex?: number | null) {
    const rowIndex = knownRowIndex ?? (await this.findRowIndex(billNumber));
    if (rowIndex === null || rowIndex === undefined) throw new Error(`No row found matching "${billNumber}"`);
    await this.openBillAtRow(rowIndex);
  }

  /** Opens a bill's read-only details page, then its actual editable form (a separate route). */
  async openEditFormByNumber(billNumber: string, knownRowIndex?: number | null) {
    await this.openBillByNumber(billNumber, knownRowIndex);
    await this.page.getByTestId('bill-button-edit').click();
  }

  /** Deletes a bill from its own details page (the reliable path — the list's hover-only "..." menu is not). */
  async deleteBillByNumber(billNumber: string, knownRowIndex?: number | null) {
    await this.openBillByNumber(billNumber, knownRowIndex);
    await this.page.getByTestId('bill-button-delete').click();
  }

  async rowText(rowIndex = 0): Promise<string> {
    return (await this.rowLocator(rowIndex).innerText()).trim();
  }

  async rowTextForBillNumber(billNumber: string, knownRowIndex?: number | null): Promise<string> {
    const rowIndex = knownRowIndex ?? (await this.findRowIndex(billNumber));
    if (rowIndex === null || rowIndex === undefined) throw new Error(`No row found matching "${billNumber}"`);
    return this.rowText(rowIndex);
  }

  async hasNoResults(): Promise<boolean> {
    return (await this.rowOpenCell(0).count()) === 0;
  }
}
