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
  // repeated runs never trip over data left behind by a previous run. Set
  // KEEP_TEST_DATA=1 to skip this and leave created bills in place for
  // manual inspection.
  trackBillForCleanup: async ({ page }, use) => {
    const createdBillNumbers: string[] = [];

    await use((billNumber: string) => {
      createdBillNumbers.push(billNumber);
    });

    if (process.env.KEEP_TEST_DATA === '1') return;

    const listPage = new BillsListPage(page);
    for (const billNumber of createdBillNumbers) {
      await listPage.goto();
      const rowIndex = await listPage.search(billNumber);
      if (rowIndex === null) continue;

      // Deletion here is immediate — there is no confirm dialog.
      await listPage.deleteBillByNumber(billNumber, rowIndex);
    }
  },
});

export { expect };
