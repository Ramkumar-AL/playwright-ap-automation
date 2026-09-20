import { test, expect } from './fixtures';
import { generateBillNumber } from '../utils/testData';
import { createBill } from '../utils/billHelpers';

test.describe('Edit bill', () => {
  test('editing a line item updates the total in the details view and the bills list', async ({
    billsListPage,
    billFormPage,
    trackBillForCleanup,
  }) => {
    const billNumber = generateBillNumber();
    trackBillForCleanup(billNumber);
    // Starts with a single line item subtotal of 100.
    await createBill(billsListPage, billFormPage, billNumber);

    await billsListPage.goto();
    await billsListPage.search(billNumber);
    await billsListPage.openBillAtRow(0);

    const expectedTotal = 250;
    await billFormPage.page.getByTestId('line-items-input-subtotal-0').fill(String(expectedTotal));
    expect(await billFormPage.getGrandTotal()).toBe(expectedTotal);

    await billFormPage.save();
    await expect(billFormPage.successToastCloseButton).toBeVisible({ timeout: 10_000 });

    // Persisted total reflected back in the bills list.
    await billsListPage.goto();
    await billsListPage.search(billNumber);
    const rowText = await billsListPage.rowText(0);
    expect(rowText.replace(/,/g, '')).toContain(expectedTotal.toString());
  });
});
