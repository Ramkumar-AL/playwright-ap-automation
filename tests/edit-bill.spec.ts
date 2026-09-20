import { test, expect } from './fixtures';
import { generateBillNumber } from '../utils/testData';
import { createBill } from '../utils/billHelpers';

test.describe('Edit bill', () => {
  test('editing a line item updates the total in the details view and the bills list', async ({
    page,
    billsListPage,
    billFormPage,
    trackBillForCleanup,
  }) => {
    const billNumber = generateBillNumber();
    trackBillForCleanup(billNumber);
    // Starts at rate 100 for a single unit -> initial total of 100.
    await createBill(billsListPage, billFormPage, billNumber);

    await billsListPage.goto();
    await billsListPage.search(billNumber);
    await billsListPage.openBill(billNumber);

    const row = billFormPage.lineItemRow(0);
    await row.getByLabel(/rate|unit price/i).fill('250');

    const expectedTotal = 250;
    await expect(billFormPage.totalDisplay).toContainText(expectedTotal.toString());

    await billFormPage.save();
    await expect(page.getByText(/bill (updated|saved)/i)).toBeVisible({ timeout: 10_000 });

    // Persisted total in the bill's own details view.
    await expect(page.getByText(expectedTotal.toString())).toBeVisible();

    // Persisted total reflected back in the bills list.
    await billsListPage.goto();
    await billsListPage.search(billNumber);
    const rowTotal = await billsListPage.getTotalForRow(billNumber);
    expect(rowTotal.replace(/[^0-9.]/g, '')).toContain(expectedTotal.toString());
  });
});
