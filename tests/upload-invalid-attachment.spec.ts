import path from 'path';
import { test, expect } from './fixtures';

const INVALID_FILE = path.join(__dirname, '..', 'fixtures', 'invalid-attachment.txt');

// Confirmed manually: this app has no custom "invalid file type" error
// message. Instead it relies on the file input's native `accept` attribute
// to restrict selection — a .txt file cannot be chosen via the OS file
// picker, and drag-and-drop is blocked the same way. Both are real browser
// behaviors Playwright can't reproduce through the UI (setInputFiles bypasses
// them), so this test verifies the restriction is actually declared, plus
// that forcing a bypass still doesn't result in the file being attached.
test.describe('Upload bill attachment - invalid file', () => {
  test('the file input restricts uploads to supported formats', async ({ billsListPage, billFormPage }) => {
    await billsListPage.openNewBillForm();

    const acceptAttr = await billFormPage.attachmentInput.getAttribute('accept');
    expect(acceptAttr).toBeTruthy();
    expect(acceptAttr).toMatch(/pdf/i);

    // Forcing a file the native picker/drag-and-drop would reject must still
    // not result in it being shown as an attached document.
    await billFormPage.uploadAttachment(INVALID_FILE);
    await expect(billFormPage.page.getByText(/invalid-attachment\.txt/i)).toHaveCount(0);
  });
});
