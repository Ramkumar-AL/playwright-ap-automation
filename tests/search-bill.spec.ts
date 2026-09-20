import { test, expect } from './fixtures';
import { generateBillNumber } from '../utils/testData';
import { createBill } from '../utils/billHelpers';

// Per AP-083/AP-084 (documented, verified test cases): search matches
// case-insensitively on a partial Voucher No, not just an exact one.
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
    const rowIndex = await billsListPage.search(billNumber);
    expect(await billsListPage.rowTextForBillNumber(billNumber, rowIndex)).toContain(billNumber);

    // A partial substring of the Voucher No must also match (this can
    // legitimately return other bills too, so look for ours specifically
    // rather than assuming it's the first row).
    const partialQuery = billNumber.slice(5, 15);
    await billsListPage.search(partialQuery);
    expect(await billsListPage.findRowIndex(billNumber)).not.toBeNull();

    // A search for a bill number that cannot exist returns no rows.
    const noMatchIndex = await billsListPage.search(`NON-EXISTENT-${Date.now()}`);
    expect(noMatchIndex).toBeNull();
  });
});
