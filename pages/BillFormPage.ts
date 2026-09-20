import { Page, Locator } from '@playwright/test';

export interface LineItem {
  description: string;
  itemName: string;
  quantity: number;
  /** The line's amount, entered directly into the Subtotal field (this app does not auto-derive it from quantity × rate). */
  subtotal: number;
}

export interface BillHeader {
  billNumber: string;
  /** Defaults to billNumber when omitted. */
  supplierInvoiceNo?: string;
  /** Exact vendor text to pick; when omitted, the first suggestion is used. */
  vendor?: string;
}

/**
 * Locators verified against the real app (https://app.aiaccountant.com/accounts-payable/create-bill)
 * via Playwright codegen — see data-testid attributes below. The "Suggestions"
 * listbox is reused by several custom dropdowns (GST Registration, Vendor,
 * Purchase Ledger, Place of Supply); clicking it with nothing typed selects
 * the top/only suggestion.
 */
export class BillFormPage {
  readonly page: Page;
  readonly locationTrigger: Locator;
  readonly suggestionsListbox: Locator;
  readonly billNumberInput: Locator;
  readonly billDateTrigger: Locator;
  readonly supplierInvoiceInput: Locator;
  readonly vendorTrigger: Locator;
  readonly purchaseLedgerTrigger: Locator;
  readonly lineItemsContainer: Locator;
  readonly addLineItemButton: Locator;
  readonly saveButton: Locator;
  readonly attachmentInput: Locator;
  readonly validationMessages: Locator;
  readonly successToastCloseButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.locationTrigger = page.getByRole('button', { name: 'Select Location' });
    this.suggestionsListbox = page.getByRole('listbox', { name: 'Suggestions' });
    this.billNumberInput = page.getByTestId('vendor-details-input-bill-number');
    this.billDateTrigger = page.getByRole('button', { name: 'Select Bill Date' });
    this.supplierInvoiceInput = page.getByTestId('vendor-details-input-supplier-invoice-no');
    this.vendorTrigger = page.getByTestId('vendor-details-select-vendor-name');
    this.purchaseLedgerTrigger = page.getByTestId('line-items-select-ledger');
    this.lineItemsContainer = page.getByTestId('line-items-section-item-mode');
    this.addLineItemButton = page.getByRole('button', { name: /add line item/i });
    this.saveButton = page.getByTestId('top-bar-button-save');
    this.attachmentInput = page.locator('input[type="file"]');
    this.validationMessages = page.getByRole('alert').or(page.getByText(/required|cannot be blank|is required/i));
    // This app's toast library exposes a generic "Close toast" dismiss button
    // on every success/error toast, making it a reliable action-completed signal.
    this.successToastCloseButton = page.getByRole('button', { name: 'Close toast' });
  }

  async fillHeader(header: BillHeader) {
    await this.locationTrigger.click();
    await this.suggestionsListbox.click();

    await this.billNumberInput.fill(header.billNumber);

    await this.billDateTrigger.click();
    await this.page.getByRole('gridcell', { name: String(new Date().getDate()), exact: true }).click();

    await this.supplierInvoiceInput.fill(header.supplierInvoiceNo ?? header.billNumber);

    await this.vendorTrigger.click();
    if (header.vendor) {
      await this.page.getByText(header.vendor, { exact: true }).click();
    } else {
      await this.suggestionsListbox.click();
    }

    // Some vendors trigger an additional, conditionally-rendered "Place of Supply" field.
    const stateTrigger = this.page.getByRole('button', { name: 'Select State' });
    if (await stateTrigger.isVisible({ timeout: 2000 }).catch(() => false)) {
      await stateTrigger.click();
      await this.suggestionsListbox.click();
    }

    // Purchase Ledger must be chosen before line items are touched — some
    // per-row fields (e.g. Godown/Location on rows beyond the first) stay
    // disabled until it's set.
    await this.selectPurchaseLedger();
  }

  async addLineItem(item: LineItem, rowIndex: number) {
    if (rowIndex > 0) {
      await this.addLineItemButton.click();
    }

    await this.lineItemsContainer.getByRole('textbox', { name: 'Enter Description' }).nth(rowIndex).fill(item.description);

    await this.page.getByTestId(`historical-data-item-details-item-name-${rowIndex}`).click();
    // .last(): the newly opened dropdown's option renders after any
    // already-selected value with matching text elsewhere on the page.
    await this.page.getByText(item.itemName, { exact: true }).last().click();

    // Godown/Location is only sometimes an active, selectable control —
    // skip it when disabled rather than hang waiting for it to become enabled.
    const godownTrigger = this.page.getByTestId(`line-items-select-godown-location-${rowIndex}`);
    if (await godownTrigger.isEnabled().catch(() => false)) {
      await godownTrigger.click();
      await this.suggestionsListbox.click();
    }

    await this.page.getByTestId(`line-items-input-quantity-${rowIndex}`).fill(String(item.quantity));
    await this.page.getByTestId(`line-items-input-subtotal-${rowIndex}`).fill(String(item.subtotal));
  }

  async selectPurchaseLedger() {
    await this.purchaseLedgerTrigger.click();
    await this.suggestionsListbox.click();
  }

  async save() {
    await this.saveButton.click();
  }

  async uploadAttachment(filePath: string) {
    await this.attachmentInput.setInputFiles(filePath);
  }

  /** Best-effort: reads the "Grand Total" row's text and extracts the numeric amount. */
  async getGrandTotal(): Promise<number> {
    const row = this.page.locator(':text("Grand Total")').last();
    const text = await row.innerText();
    const match = text.replace(/,/g, '').match(/[\d.]+/);
    return match ? parseFloat(match[0]) : NaN;
  }
}
