import { expect } from '@playwright/test';
import { BillsListPage } from '../pages/BillsListPage';
import { BillFormPage, LineItem } from '../pages/BillFormPage';

/** Creates a single-line-item bill and saves it, waiting for the success toast. */
export async function createBill(
  billsListPage: BillsListPage,
  billFormPage: BillFormPage,
  billNumber: string,
  lineItem: LineItem = { description: 'Consulting services', itemName: '1 Ltr Pet Bottle', quantity: 1, subtotal: 100 }
) {
  await billsListPage.openNewBillForm();
  await billFormPage.fillHeader({ billNumber });
  await billFormPage.addLineItem(lineItem, 0);
  await billFormPage.selectPurchaseLedger();
  await billFormPage.save();
  await expect(billFormPage.successToastCloseButton).toBeVisible({ timeout: 10_000 });
}
