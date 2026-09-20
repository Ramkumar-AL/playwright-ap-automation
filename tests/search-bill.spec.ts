import { test, expect } from './fixtures';
import { generateBillNumber } from '../utils/testData';
import { createBill } from '../utils/billHelpers';

test.describe('Search bills', () => {
  test('searching by bill number returns only the matching bill', async ({
    billsListPage,
    billFormPage,
    trackBillForCleanup,
  }) => {
    const billNumber = generateBillNumber();
    trackBillForCleanup(billNumber);
    await createBill(billsListPage, billFormPage, billNumber);

    await billsListPage.goto();
    await billsListPage.search(billNumber);
    await expect(billsListPage.rowByBillNumber(billNumber)).toBeVisible();

    // A search for a bill number that cannot exist returns no rows.
    await billsListPage.search(`NON-EXISTENT-${Date.now()}`);
    await expect.poll(() => billsListPage.hasNoResults(), { timeout: 5000 }).toBe(true);
  });
});
