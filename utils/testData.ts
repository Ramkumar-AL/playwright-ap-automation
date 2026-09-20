/** Unique-per-run bill number so repeated test runs never collide with earlier data. */
export function generateBillNumber(): string {
  return `BILL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function futureDateISO(daysAhead: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().split('T')[0];
}
