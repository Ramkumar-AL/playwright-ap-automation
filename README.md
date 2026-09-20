# Accounts Payable — Bill Automation

Playwright (TypeScript) end-to-end tests for the Bill workflows of the Accounts
Payable module at `https://app.aiaccountant.com/accounts-payable`.

## Scenarios covered

| Priority | File | Scenario |
|---|---|---|
| High | `tests/create-bill.spec.ts` | Create a bill with multiple line items and verify the total, both on-screen and after save |
| High | `tests/required-field-validation.spec.ts` | Attempting to save an incomplete bill is blocked with validation feedback |
| High | `tests/delete-bill.spec.ts` | Delete flow: viewing a bill's details without deleting keeps it in the list, clicking the trash icon removes it (2 tests) |
| High | `tests/edit-bill.spec.ts` | Editing a bill's line item updates the total in both the details view and the bills list |
| Medium | `tests/upload-valid-attachment.spec.ts` | Uploading a single PDF attaches it to the bill successfully |
| Medium | `tests/upload-invalid-attachment.spec.ts` | The file input restricts uploads to supported formats; forcing a bypass still doesn't attach the file |

7 tests total across 6 files, covering all 4 high-priority scenarios and 2 of
the medium-priority scenarios from the exercise brief. (Search/filter is
intentionally not automated as a standalone scenario, by request — the
underlying `BillsListPage.search()` lookup is still used internally by the
other tests to locate the bill they just created.)

## Project structure

```
pages/            Page Object Model classes (LoginPage, BillsListPage, BillFormPage)
setup/            One-time login, saved as a reusable storage state for all tests
tests/            Spec files + shared fixtures.ts (page-object + cleanup fixtures)
utils/            Test-data generators and a createBill() helper shared by specs
fixtures/         Static files used by the upload tests (valid PDF, invalid .txt)
playwright.config.ts
```

## Prerequisites

- Node.js 18+
- A dedicated **test** account on the AUT (do not use a production/admin account)

## Setup

```bash
npm install
npx playwright install chromium   # downloads the browser binary, one-time
cp .env.example .env
```

Fill in `.env`:

| Variable | Required | Description |
|---|---|---|
| `BASE_URL` | No (defaults to `https://app.aiaccountant.com`) | Root URL of the application under test |
| `TEST_USER_EMAIL` | Yes | Login email for a test account |
| `TEST_USER_PASSWORD` | Yes | Login password for the same test account |

`.env` is git-ignored. Never commit credentials, tokens, or `.env` itself.

## Running the tests

```bash
npm test                # headless, all projects (login setup + chromium tests)
npm run test:headed     # headed browser, useful while adjusting locators
npm run test:ui         # Playwright's interactive UI mode
npm run report          # open the last HTML report
```

A `setup` project logs in once via the UI and saves the session to
`playwright/.auth/user.json` (git-ignored); every other test reuses that
session instead of logging in again, which is both faster and more stable.

## Test data and cleanup

- Every bill created by a test uses a unique, timestamp-based bill number
  (`utils/testData.ts#generateBillNumber`), so parallel or repeated runs never
  collide with data from a previous run.
- A shared `trackBillForCleanup` fixture (`tests/fixtures.ts`) deletes any
  bill a test created, once the test finishes (pass or fail), so the AUT is
  left clean after each run. Tests whose own assertions already delete the
  bill (e.g. the "confirm delete" case) skip this fixture since there is
  nothing left to clean up.
- Set `KEEP_TEST_DATA=1` to skip this cleanup and leave created bills in
  place — useful while manually inspecting a run, but leaves clutter behind,
  so don't leave it set for routine runs.

## Notes on the real app

Most locators in `pages/*.ts` were confirmed against the live app via
Playwright codegen and DevTools inspection (not guessed), which surfaced a
few app-specific behaviors worth knowing:

- The bill form (`/accounts-payable/create-bill`) uses custom searchable
  dropdowns (`data-testid`-based) rather than native `<select>`/`<label>`
  pairs, and a shared `role="listbox"` named "Suggestions" that several
  fields reuse.
- A line item's Amount can be entered two ways: fill **Unit Rate** and let it
  auto-calculate as Quantity × Unit Rate (the documented, intended flow — used
  by `create-bill.spec.ts`), or type directly into **Subtotal** (used by the
  simpler single-line-item helper in `utils/billHelpers.ts`). `BillFormPage.addLineItem()`
  supports both via the `LineItem.unitRate` / `LineItem.subtotal` fields.
- Voucher Type defaults to "Purchase" and doesn't need to be touched.
- Every successful action (create, edit, delete) shows a toast with a
  generic "Close toast" dismiss button, used across the suite as the
  success signal.
- **Deleting a bill has no confirm/cancel dialog**, and the list row's "..."
  menu only renders on hover (unreliable to trigger via `.click()`).
  Deletion instead goes through the always-visible trash icon
  (`data-testid="bill-button-delete"`) on the bill's own details page.
  `delete-bill.spec.ts` adapts the required "confirmation and cancellation"
  scenario accordingly: viewing the details page and navigating back without
  deleting is the safe path, and clicking the trash icon is the destructive one.
- **Invalid file-type rejection has no error message** — confirmed manually
  that a `.txt` file cannot be selected via the file picker or drag-and-drop
  at all; the app relies on the file input's native `accept` attribute, not
  a custom validation message. `upload-invalid-attachment.spec.ts` checks
  that restriction is actually declared, plus that forcing a bypass (via
  `setInputFiles`, which real users can't do) still doesn't attach the file.
- **Search results can span multiple rows** on this shared, actively-used
  account (1700+ bills, broad partial-text matching), and the table can
  flicker through loading/stale states after typing — sometimes more than
  once, and the debounced filter itself can take several seconds on a slow
  connection. Every other test uses `BillsListPage.search()` internally to
  locate the bill it just created before opening/editing/deleting it.
  `findRowIndex()` is the single, internally-retrying source of truth for
  "is this bill in the results", checking for the app's own explicit
  `"No bills available for selected filter."` empty-state message rather
  than just an ambiguous zero row count; `search()` returns its resolved
  index directly so callers don't need a second, separately-flaky lookup
  right after.

## Source of test data

Test data (exact vendor/GST Registration/Purchase Ledger names, expected
totals) and exact success/validation message wording used in the specs come
from a manually-authored, verified test case document (`AP_Module_TestCases_final.xlsx`,
test cases AP-001, AP-013, AP-079, AP-082), not from guessing. That document
covers a much larger surface (Review Voucher approval, vendor matching,
split bills, sync, bulk uploads, and more) than this suite automates — this
project deliberately stays scoped to the scenarios above.

## Fixtures

- `fixtures/sample-bill.pdf` — a minimal, valid single-page PDF used by the
  successful-upload test.
- `fixtures/invalid-attachment.txt` — a plain-text file used by the
  invalid-attachment test to verify the app rejects unsupported file types.
