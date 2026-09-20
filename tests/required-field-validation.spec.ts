import { test, expect } from './fixtures';

test.describe('Bill required-field validation', () => {
  test('blocks saving an incomplete bill and surfaces validation feedback', async ({
    billsListPage,
    billFormPage,
  }) => {
    await billsListPage.openNewBillForm();

    // Attempt to save with no vendor, no dates, and no line items.
    await billFormPage.save();

    await expect(billFormPage.validationMessages.first()).toBeVisible({ timeout: 5000 });

    // The form must still be open — the incomplete bill was never persisted.
    await expect(billFormPage.saveButton).toBeVisible();
  });
});
