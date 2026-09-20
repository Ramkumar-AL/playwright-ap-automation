import { test, expect } from './fixtures';
import { generateBillNumber } from '../utils/testData';

test.describe('Create bill', () => {
  test('creates a bill with multiple line items and shows the correct total', async ({
    billsListPage,
    billFormPage,
    trackBillForCleanup,
  }) => {
    const billNumber = generateBillNumber();
    trackBillForCleanup(billNumber);

    await billsListPage.openNewBillForm();
    await billFormPage.fillHeader({ billNumber });

    await billFormPage.addLineItem({ description: 'Office chairs', itemName: '1 Ltr Pet Bottle', quantity: 2, subtotal: 300 }, 0);
    await billFormPage.addLineItem({ description: 'Standing desk', itemName: '1 Ltr. Pouch Film', quantity: 1, subtotal: 400 }, 1);

    const expectedTotal = 300 + 400; // 700
    await expect.poll(() => billFormPage.getGrandTotal()).toBe(expectedTotal);

    await billFormPage.save();
    await expect(billFormPage.successToastCloseButton).toBeVisible({ timeout: 10_000 });

    // Persisted total must match what was shown on the form before saving.
    await billsListPage.goto();
    await billsListPage.search(billNumber);
    const rowText = await billsListPage.rowText(0);
    expect(rowText.replace(/,/g, '')).toContain(expectedTotal.toString());
  });
});
