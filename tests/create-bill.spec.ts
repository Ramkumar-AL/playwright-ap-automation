import { test, expect } from './fixtures';
import { generateBillNumber, todayISO, futureDateISO } from '../utils/testData';

test.describe('Create bill', () => {
  test('creates a bill with multiple line items and shows the correct total', async ({
    page,
    billsListPage,
    billFormPage,
    trackBillForCleanup,
  }) => {
    const billNumber = generateBillNumber();
    trackBillForCleanup(billNumber);

    await billsListPage.openNewBillForm();
    await billFormPage.fillHeader({
      vendor: 'Acme Supplies',
      billNumber,
      billDate: todayISO(),
      dueDate: futureDateISO(30),
    });

    await billFormPage.addLineItem({ description: 'Office chairs', quantity: 2, rate: 150 }, 0);
    await billFormPage.addLineItem({ description: 'Standing desk', quantity: 1, rate: 400 }, 1);

    const expectedTotal = 2 * 150 + 1 * 400; // 700
    await expect(billFormPage.totalDisplay).toContainText(expectedTotal.toString());

    await billFormPage.save();
    await expect(page.getByText(/bill (created|saved)/i)).toBeVisible({ timeout: 10_000 });

    // Persisted total must match what was shown on the form before saving.
    await billsListPage.goto();
    await billsListPage.search(billNumber);
    const rowTotal = await billsListPage.getTotalForRow(billNumber);
    expect(rowTotal.replace(/[^0-9.]/g, '')).toContain(expectedTotal.toString());
  });
});
