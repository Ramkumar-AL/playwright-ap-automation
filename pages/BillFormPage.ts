import { Page, Locator } from '@playwright/test';

export interface LineItem {
  description: string;
  quantity: number;
  rate: number;
}

export interface BillHeader {
  vendor: string;
  billNumber: string;
  billDate: string;
  dueDate: string;
}

/**
 * Locators here are best-effort, role/label-based guesses (the AUT could not be
 * reached from the environment this suite was authored in — outbound network
 * access was blocked by sandbox policy). If the real DOM uses different
 * labels/roles, adjust the getters below; every test consumes them, so a
 * single edit here propagates everywhere.
 */
export class BillFormPage {
  readonly page: Page;
  readonly vendorInput: Locator;
  readonly billNumberInput: Locator;
  readonly billDateInput: Locator;
  readonly dueDateInput: Locator;
  readonly addLineItemButton: Locator;
  readonly saveButton: Locator;
  readonly totalDisplay: Locator;
  readonly attachmentInput: Locator;
  readonly validationMessages: Locator;

  constructor(page: Page) {
    this.page = page;
    this.vendorInput = page.getByLabel(/vendor/i);
    this.billNumberInput = page.getByLabel(/bill (number|no\.?)/i);
    this.billDateInput = page.getByLabel(/bill date/i);
    this.dueDateInput = page.getByLabel(/due date/i);
    this.addLineItemButton = page.getByRole('button', { name: /add line|add item/i });
    this.saveButton = page.getByRole('button', { name: /save|create bill/i });
    this.totalDisplay = page.getByTestId('bill-total');
    this.attachmentInput = page.locator('input[type="file"]');
    this.validationMessages = page.getByRole('alert').or(page.getByText(/required|cannot be blank|is required/i));
  }

  lineItemRow(index: number): Locator {
    // +1 skips the header row inside the line-items table.
    return this.page.getByRole('row').nth(index + 1);
  }

  async fillVendor(vendor: string) {
    await this.vendorInput.fill(vendor);
    const option = this.page.getByRole('option', { name: vendor });
    if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
      await option.click();
    }
  }

  async fillHeader(header: BillHeader) {
    await this.fillVendor(header.vendor);
    await this.billNumberInput.fill(header.billNumber);
    await this.billDateInput.fill(header.billDate);
    await this.dueDateInput.fill(header.dueDate);
  }

  async addLineItem(item: LineItem, rowIndex: number) {
    if (rowIndex > 0) {
      await this.addLineItemButton.click();
    }
    const row = this.lineItemRow(rowIndex);
    await row.getByLabel(/description/i).fill(item.description);
    await row.getByLabel(/quantity/i).fill(String(item.quantity));
    await row.getByLabel(/rate|unit price/i).fill(String(item.rate));
  }

  async save() {
    await this.saveButton.click();
  }

  async uploadAttachment(filePath: string) {
    await this.attachmentInput.setInputFiles(filePath);
  }

  async getDisplayedTotal(): Promise<string> {
    if (await this.totalDisplay.count()) {
      return (await this.totalDisplay.innerText()).trim();
    }
    const totalRow = this.page.getByText(/^total$/i).locator('xpath=..');
    return (await totalRow.innerText()).trim();
  }
}
