import path from 'path';
import { test, expect } from './fixtures';
import { generateBillNumber, todayISO, futureDateISO } from '../utils/testData';

const INVALID_FILE = path.join(__dirname, '..', 'fixtures', 'invalid-attachment.txt');

test.describe('Upload bill attachment - invalid file', () => {
  test('uploading an unsupported file type is rejected with an error message', async ({
    page,
    billsListPage,
    billFormPage,
  }) => {
    // Nothing gets persisted in this flow, so there is no bill to clean up.
    await billsListPage.openNewBillForm();
    await billFormPage.fillHeader({
      vendor: 'Acme Supplies',
      billNumber: generateBillNumber(),
      billDate: todayISO(),
      dueDate: futureDateISO(30),
    });
    await billFormPage.addLineItem({ description: 'Consulting services', quantity: 1, rate: 100 }, 0);

    await billFormPage.uploadAttachment(INVALID_FILE);

    const errorMessage = page.getByText(/unsupported file type|invalid file|not allowed/i).first();
    // Some apps validate on file selection, others only on save — cover both.
    if (!(await errorMessage.isVisible().catch(() => false))) {
      await billFormPage.save();
    }
    await expect(errorMessage).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText(/invalid-attachment\.txt/i)).toHaveCount(0);
  });
});
