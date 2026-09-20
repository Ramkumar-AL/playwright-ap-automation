import { test, expect } from './fixtures';

// Per AP-001 (documented, verified test case): leaving GST Registration
// empty on an otherwise-untouched form surfaces the exact inline message
// "GST Registration is required".
test.describe('Bill required-field validation', () => {
  test('blocks saving an incomplete bill and surfaces validation feedback', async ({
    billsListPage,
    billFormPage,
  }) => {
    await billsListPage.openNewBillForm();

    // Attempt to save with no fields filled at all, including GST Registration.
    await billFormPage.save();

    await expect(billFormPage.page.getByText('GST Registration is required')).toBeVisible({ timeout: 5000 });

    // The form must still be open — the incomplete bill was never persisted.
    await expect(billFormPage.saveButton).toBeVisible();
  });
});
