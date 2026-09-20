import { test, expect } from './fixtures';
import { generateBillNumber } from '../utils/testData';

// Test data and expected results per AP-013 (documented, verified test case):
// Vendor 'AXIS BANK', GST Registration 'Andhra Pradesh Registration - 09AAICP7470Q1ZG',
// Purchase Ledger 'Purchase Accounts', item '1 Ltr Pet Bottle' at Qty 3 x Rate 100 => 300.00.
test.describe('Create bill', () => {
  test('creates a bill with multiple line items and shows the correct total', async ({
    billsListPage,
    billFormPage,
    trackBillForCleanup,
  }) => {
    const billNumber = generateBillNumber();
    trackBillForCleanup(billNumber);

    await billsListPage.openNewBillForm();
    await billFormPage.fillHeader({
      billNumber,
      vendor: 'AXIS BANK',
      gstRegistration: 'Andhra Pradesh Registration - 09AAICP7470Q1ZG',
      purchaseLedger: 'Purchase Accounts',
    });

    // Line 1 matches AP-013 exactly: 3 x 100 = 300.
    await billFormPage.addLineItem({ description: 'Office chairs', itemName: '1 Ltr Pet Bottle', quantity: 3, unitRate: 100 }, 0);
    // Line 2 exercises multi-item summing: 2 x 200 = 400.
    await billFormPage.addLineItem({ description: 'Standing desk', itemName: '1 Ltr. Pouch Film', quantity: 2, unitRate: 200 }, 1);

    const expectedTotal = 300 + 400; // 700
    await expect.poll(() => billFormPage.getGrandTotal()).toBe(expectedTotal);

    await billFormPage.save();
    await expect(billFormPage.successToastCloseButton).toBeVisible({ timeout: 10_000 });

    // Persisted total must match what was shown on the form before saving.
    await billsListPage.goto();
    await billsListPage.search(billNumber);
    const rowText = await billsListPage.rowTextForBillNumber(billNumber);
    expect(rowText.replace(/,/g, '')).toContain(expectedTotal.toString());
  });
});
