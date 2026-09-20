import { Page, Locator } from '@playwright/test';

export interface LineItem {
  description: string;
  itemName: string;
  quantity: number;
  /** When set, fills Unit Rate and lets Amount auto-calculate as quantity × unitRate (the app's documented, intended flow). */
  unitRate?: number;
  /** When set (and unitRate isn't), types the line's Amount directly instead. */
  subtotal?: number;
}

export interface BillHeader {
  billNumber: string;
  /** Defaults to billNumber when omitted. */
  supplierInvoiceNo?: string;
  /** Exact vendor text to pick; when omitted, the first suggestion is used. */
  vendor?: string;
  /** Exact GST Registration text to pick; when omitted, the first suggestion is used. */
  gstRegistration?: string;
  /** Exact Purchase Ledger text to pick; when omitted, the first suggestion is used. */
  purchaseLedger?: string;
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
    // This app's toast library exposes a generic "Close toast" dismiss button
    // on every success/error toast, making it a reliable action-completed signal.
    this.successToastCloseButton = page.getByRole('button', { name: 'Close toast' });
  }

  async fillHeader(header: BillHeader) {
    await this.locationTrigger.click();
    if (header.gstRegistration) {
      // .last(): these dropdowns can render the same text twice (e.g. a
      // category header plus the actual leaf option).
      await this.page.getByText(header.gstRegistration, { exact: true }).last().click();
    } else {
      await this.suggestionsListbox.click();
    }

    await this.billNumberInput.fill(header.billNumber);

    await this.billDateTrigger.click();
    await this.page.getByRole('gridcell', { name: String(new Date().getDate()), exact: true }).click();

    await this.supplierInvoiceInput.fill(header.supplierInvoiceNo ?? header.billNumber);

    await this.vendorTrigger.click();
    if (header.vendor) {
      await this.page.getByText(header.vendor, { exact: true }).last().click();
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
    await this.selectPurchaseLedger(header.purchaseLedger);
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

    // Godown/Location is left untouched: it comes pre-filled on row 0, and on
    // later rows it stays disabled regardless (confirmed manually) — it does
    // not gate Quantity/Subtotal, which unlock once Purchase Ledger is set.
    await this.page.getByTestId(`line-items-input-quantity-${rowIndex}`).fill(String(item.quantity));

    if (item.unitRate !== undefined) {
      // Documented flow: Amount auto-calculates as quantity × unitRate.
      await this.page.getByTestId(`line-items-input-unit-rate-${rowIndex}`).fill(String(item.unitRate));
    } else if (item.subtotal !== undefined) {
      await this.page.getByTestId(`line-items-input-subtotal-${rowIndex}`).fill(String(item.subtotal));
    }
  }

  async selectPurchaseLedger(exactName?: string) {
    await this.purchaseLedgerTrigger.click();
    if (exactName) {
      // .last(): this tree-structured dropdown can show the name as both a
      // bold category header and the actual selectable leaf item.
      await this.page.getByText(exactName, { exact: true }).last().click();
    } else {
      await this.suggestionsListbox.click();
    }
  }

  async save() {
    await this.saveButton.click();
  }

  async uploadAttachment(filePath: string) {
    await this.attachmentInput.setInputFiles(filePath);
  }

  /**
   * Reads the amount next to "Grand Total" and parses it as a number. The
   * create/edit form renders the label and amount as direct siblings under
   * one parent, but the read-only bill details page renders them as
   * separate cells in the same row — so this widens its search up the
   * ancestor chain (capped low enough to stay within the Grand Total row
   * itself, without also reaching a shared ancestor that includes Sub Total).
   */
  async getGrandTotal(): Promise<number> {
    const label = this.page.getByText('Grand Total', { exact: true });
    for (let levels = 1; levels <= 3; levels++) {
      const container = label.locator(`xpath=${Array(levels).fill('..').join('/')}`);
      const text = await container.innerText().catch(() => '');
      const match = text.replace(/,/g, '').match(/[\d.]+/);
      if (match) return parseFloat(match[0]);
    }
    return NaN;
  }
}
