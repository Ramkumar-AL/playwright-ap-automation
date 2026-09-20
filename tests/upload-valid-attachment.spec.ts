import path from 'path';
import { test, expect } from './fixtures';
import { generateBillNumber, todayISO, futureDateISO } from '../utils/testData';

const VALID_PDF = path.join(__dirname, '..', 'fixtures', 'sample-bill.pdf');

test.describe('Upload bill attachment - valid file', () => {
  test('uploading a single PDF attaches it to the bill successfully', async ({
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
    await billFormPage.addLineItem({ description: 'Consulting services', quantity: 1, rate: 100 }, 0);

    await billFormPage.uploadAttachment(VALID_PDF);
    await expect(page.getByText(/sample-bill\.pdf/i)).toBeVisible({ timeout: 10_000 });

    await billFormPage.save();
    await expect(page.getByText(/bill (created|saved)/i)).toBeVisible({ timeout: 10_000 });

    // Attachment must still be present after the round trip through the details view.
    await billsListPage.goto();
    await billsListPage.search(billNumber);
    await billsListPage.openBill(billNumber);
    await expect(page.getByText(/sample-bill\.pdf/i)).toBeVisible();
  });
});
