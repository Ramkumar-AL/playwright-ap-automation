import { test, expect } from './fixtures';
import { generateBillNumber } from '../utils/testData';
import { createBill } from '../utils/billHelpers';

// Deletion goes through the always-visible trash icon on a bill's own
// details page (data-testid="bill-button-delete") — the list's "..." menu
// only renders on hover, which Playwright can't reliably trigger. There is
// no confirm/cancel dialog either way; deleting shows a "Bill deleted" toast
// (exact wording per AP-082). The "cancel" scenario is adapted accordingly:
// viewing the details page and navigating back without deleting is the safe
// path, and only an explicit click on the trash icon is destructive.
test.describe('Delete bill', () => {
  test('viewing the details page without deleting keeps the bill in the list', async ({
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
    await billsListPage.openBillAtRow(0);

    await expect(page.getByTestId('bill-button-delete')).toBeVisible();
    await page.getByTestId('ap-button-back').click();

    await billsListPage.goto();
    await billsListPage.search(billNumber);
    expect(await billsListPage.hasNoResults()).toBe(false);
  });

  test('clicking the delete icon removes the bill from the list', async ({ page, billsListPage, billFormPage }) => {
    const billNumber = generateBillNumber();
    // No cleanup tracking needed: the test itself deletes the bill.
    await createBill(billsListPage, billFormPage, billNumber);

    await billsListPage.goto();
    await billsListPage.search(billNumber);
    await billsListPage.deleteBillAtRow(0);

    await expect(page.getByText('Bill deleted')).toBeVisible({ timeout: 10_000 });

    await billsListPage.goto();
    await billsListPage.search(billNumber);
    expect(await billsListPage.hasNoResults()).toBe(true);
  });
});
