import { Page, Locator, expect } from '@playwright/test';

/**
 * Locators verified against the real Purchases list
 * (https://app.aiaccountant.com/accounts-payable) via Playwright codegen and
 * DevTools inspection. The table uses
 * data-testid="ap-table-row-{rowIndex}-cell-{colIndex}"; cell index 3 is the
 * clickable cell that opens a bill, cell index 8 holds the row's "..."
 * actions button (data-testid="ap-button-Option"). Clicking "Delete" from
 * that menu deletes immediately — there is no confirm/cancel dialog.
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
    // The table shows loading skeletons briefly after a search; wait for real
    // matching data (or a genuine empty state) before any caller acts on it.
    await expect
      .poll(
        async () => {
          if (await this.hasNoResults()) return true;
          const text = await this.rowText(0).catch(() => '');
          return text.includes(query);
        },
        { timeout: 10_000 }
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

  async rowText(rowIndex = 0): Promise<string> {
    return (await this.rowLocator(rowIndex).innerText()).trim();
  }

  rowActionsTrigger(rowIndex = 0): Locator {
    return this.page.getByTestId(`ap-table-row-${rowIndex}-cell-8`).getByTestId('ap-button-Option');
  }

  async hasNoResults(): Promise<boolean> {
    return (await this.rowOpenCell(0).count()) === 0;
  }
}
