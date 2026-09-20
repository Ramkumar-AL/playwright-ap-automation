import { BillsListPage } from '../pages/BillsListPage';
import { BillFormPage, LineItem } from '../pages/BillFormPage';
import { todayISO, futureDateISO } from './testData';

/** Creates a single-line-item bill under the given vendor/bill number and saves it. */
export async function createBill(
  billsListPage: BillsListPage,
  billFormPage: BillFormPage,
  billNumber: string,
  vendor = 'Acme Supplies',
  lineItem: LineItem = { description: 'Consulting services', quantity: 1, rate: 100 }
) {
  await billsListPage.openNewBillForm();
  await billFormPage.fillHeader({
    vendor,
    billNumber,
    billDate: todayISO(),
    dueDate: futureDateISO(30),
  });
  await billFormPage.addLineItem(lineItem, 0);
  await billFormPage.save();
}
