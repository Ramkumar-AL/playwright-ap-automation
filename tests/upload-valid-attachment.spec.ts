import path from 'path';
import { test, expect } from './fixtures';
import { generateBillNumber } from '../utils/testData';

const VALID_PDF = path.join(__dirname, '..', 'fixtures', 'sample-bill.pdf');

test.describe('Upload bill attachment - valid file', () => {
  test('uploading a single PDF attaches it to the bill successfully', async ({
    billsListPage,
    billFormPage,
    trackBillForCleanup,
  }) => {
    const billNumber = generateBillNumber();
    trackBillForCleanup(billNumber);

    await billsListPage.openNewBillForm();
    await billFormPage.fillHeader({ billNumber });
    await billFormPage.addLineItem({ description: 'Consulting services', itemName: '1 Ltr Pet Bottle', quantity: 1, subtotal: 100 }, 0);
    await billFormPage.selectPurchaseLedger();

    await billFormPage.uploadAttachment(VALID_PDF);
    await expect(billFormPage.page.getByText(/sample-bill\.pdf/i)).toBeVisible({ timeout: 10_000 });

    await billFormPage.save();
    await expect(billFormPage.successToastCloseButton).toBeVisible({ timeout: 10_000 });

    // Attachment must still be present after the round trip through the details view.
    await billsListPage.goto();
    await billsListPage.search(billNumber);
    await billsListPage.openBillAtRow(0);
    await expect(billFormPage.page.getByText(/sample-bill\.pdf/i)).toBeVisible();
  });
});
