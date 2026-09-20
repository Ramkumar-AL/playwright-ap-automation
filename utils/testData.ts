/** Unique-per-run bill number so repeated test runs never collide with earlier data. */
export function generateBillNumber(): string {
  return `BILL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
