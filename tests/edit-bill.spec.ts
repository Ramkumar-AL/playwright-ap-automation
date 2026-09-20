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
    await billsListPage.openEditFormByNumber(billNumber);

    const expectedTotal = 250;
    await billFormPage.page.getByTestId('line-items-input-subtotal-0').fill(String(expectedTotal));
    await expect.poll(() => billFormPage.getGrandTotal()).toBe(expectedTotal);

    await billFormPage.save();
    // Exact wording confirmed per AP-079.
    await expect(billFormPage.page.getByText('Bill updated')).toBeVisible({ timeout: 10_000 });

    // Persisted total in the bill's own (read-only) details view.
    await billsListPage.goto();
    await billsListPage.search(billNumber);
    await billsListPage.openBillByNumber(billNumber);
    await expect(billFormPage.page.getByText(expectedTotal.toString())).toBeVisible();

    // Persisted total reflected back in the bills list.
    await billsListPage.goto();
    await billsListPage.search(billNumber);
    const rowText = await billsListPage.rowTextForBillNumber(billNumber);
    expect(rowText.replace(/,/g, '')).toContain(expectedTotal.toString());
  });
});
