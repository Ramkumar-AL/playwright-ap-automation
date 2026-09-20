import { test, expect } from './fixtures';
import { generateBillNumber } from '../utils/testData';
import { createBill } from '../utils/billHelpers';

// This app has no confirm/cancel dialog on delete — selecting "Delete" from
// the row menu removes the bill immediately (with a toast, not a modal).
// The "cancel" scenario is adapted accordingly: dismissing the actions menu
// without picking Delete is the safe path, and only an explicit Delete click
// is destructive.
test.describe('Delete bill', () => {
  test('dismissing the row menu without choosing Delete keeps the bill in the list', async ({
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
    await billsListPage.rowActionsTrigger(0).click();

    const deleteMenuItem = page.getByRole('menuitem', { name: 'Delete' });
    await expect(deleteMenuItem).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(deleteMenuItem).toBeHidden();

    await billsListPage.goto();
    await billsListPage.search(billNumber);
    expect(await billsListPage.hasNoResults()).toBe(false);
  });

  test('choosing Delete removes the bill from the list', async ({ page, billsListPage, billFormPage }) => {
    const billNumber = generateBillNumber();
    // No cleanup tracking needed: the test itself deletes the bill.
    await createBill(billsListPage, billFormPage, billNumber);

    await billsListPage.goto();
    await billsListPage.search(billNumber);
    await billsListPage.rowActionsTrigger(0).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();

    await expect(billFormPage.successToastCloseButton).toBeVisible({ timeout: 10_000 });

    await billsListPage.goto();
    await billsListPage.search(billNumber);
    expect(await billsListPage.hasNoResults()).toBe(true);
  });
});
