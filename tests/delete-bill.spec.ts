import { test, expect } from './fixtures';
import { generateBillNumber } from '../utils/testData';
import { createBill } from '../utils/billHelpers';

test.describe('Delete bill', () => {
  test('cancelling the confirmation keeps the bill in the list', async ({
    page,
    billsListPage,
    billFormPage,
    trackBillForCleanup,
  }) => {
    const billNumber = generateBillNumber();
    trackBillForCleanup(billNumber);
    await createBill(billsListPage, billFormPage, billNumber);

    await billsListPage.goto();
    await billsListPage.search(billNumber);
    await billsListPage.deleteBill(billNumber);

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /cancel/i }).click();

    await expect(billsListPage.rowByBillNumber(billNumber)).toBeVisible();
  });

  test('confirming deletion removes the bill from the list', async ({ page, billsListPage, billFormPage }) => {
    const billNumber = generateBillNumber();
    // No cleanup tracking needed: the test itself deletes the bill.
    await createBill(billsListPage, billFormPage, billNumber);

    await billsListPage.goto();
    await billsListPage.search(billNumber);
    await billsListPage.deleteBill(billNumber);

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /delete|confirm|yes/i }).click();

    await expect(page.getByText(/bill deleted/i)).toBeVisible({ timeout: 10_000 });

    await billsListPage.goto();
    await billsListPage.search(billNumber);
    await expect(billsListPage.rowByBillNumber(billNumber)).toHaveCount(0);
  });
});
