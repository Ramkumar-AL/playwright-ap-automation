import { test as base, expect } from '@playwright/test';
import { BillsListPage } from '../pages/BillsListPage';
import { BillFormPage } from '../pages/BillFormPage';

type Fixtures = {
  billsListPage: BillsListPage;
  billFormPage: BillFormPage;
  trackBillForCleanup: (billNumber: string) => void;
};

export const test = base.extend<Fixtures>({
  billsListPage: async ({ page }, use) => {
    const billsListPage = new BillsListPage(page);
    await billsListPage.goto();
    await use(billsListPage);
  },

  billFormPage: async ({ page }, use) => {
    await use(new BillFormPage(page));
  },

  // Deletes every tracked bill after the test finishes (pass or fail) so
  // repeated runs never trip over data left behind by a previous run.
  trackBillForCleanup: async ({ page }, use) => {
    const createdBillNumbers: string[] = [];

    await use((billNumber: string) => {
      createdBillNumbers.push(billNumber);
    });

    const listPage = new BillsListPage(page);
    for (const billNumber of createdBillNumbers) {
      await listPage.goto();
      await listPage.search(billNumber);
      const row = listPage.rowByBillNumber(billNumber);
      if (await row.count()) {
        await listPage.deleteBill(billNumber);
        const confirmButton = page.getByRole('dialog').getByRole('button', { name: /delete|confirm|yes/i });
        await confirmButton.click().catch(() => {});
      }
    }
  },
});

export { expect };
