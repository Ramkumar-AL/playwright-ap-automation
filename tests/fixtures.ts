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
      if (await listPage.hasNoResults()) continue;

      // Deletion here is immediate — there is no confirm dialog.
      await listPage.rowActionsTrigger(0).click();
      await page.getByRole('menuitem', { name: 'Delete' }).click();
    }
  },
});

export { expect };
