# Accounts Payable — Bill Automation

Playwright (TypeScript) end-to-end tests for the Bill workflows of the Accounts
Payable module at `https://app.aiaccountant.com/accounts-payable`.

## Scenarios covered

| Priority | File | Scenario |
|---|---|---|
| High | `tests/create-bill.spec.ts` | Create a bill with multiple line items and verify the total, both on-screen and after save |
| High | `tests/required-field-validation.spec.ts` | Attempting to save an incomplete bill is blocked with validation feedback |
| High | `tests/delete-bill.spec.ts` | Delete flow: dismissing the row menu keeps the bill, choosing Delete removes it (2 tests) |
| High | `tests/edit-bill.spec.ts` | Editing a bill's line item updates the total in both the details view and the bills list |
| Medium | `tests/search-bill.spec.ts` | Searching by bill number returns only the matching bill; a non-existent search returns no results |
| Medium | `tests/upload-valid-attachment.spec.ts` | Uploading a single PDF attaches it to the bill successfully |
| Medium | `tests/upload-invalid-attachment.spec.ts` | Uploading an unsupported file type is rejected with an error message |

9 tests total across 7 files, covering all 4 high-priority scenarios and 3 of
the medium-priority scenarios from the exercise brief.

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
- **Deleting a bill has no confirm/cancel dialog** — selecting "Delete" from
  a row's "..." menu removes it immediately. `delete-bill.spec.ts` adapts
  the required "confirmation and cancellation" scenario accordingly:
  dismissing the menu without picking Delete is the safe path, and an
  explicit Delete click is the destructive one.

The upload tests' post-upload assertions (filename display, invalid-file
error text) were not verified against the live app and may need adjusting —
if they fail, open the failing test's trace (`npm run test:ui` or
`npx playwright show-trace <path>`) to see the actual DOM/message and update
`pages/BillFormPage.ts` accordingly; every test consumes these getters, so a
single fix there propagates everywhere.

## Source of test data

Test data (exact vendor/GST Registration/Purchase Ledger names, expected
totals) and exact success/validation message wording used in the specs come
from a manually-authored, verified test case document (`AP_Module_TestCases_final.xlsx`,
test cases AP-001, AP-013, AP-079, AP-082, AP-083/AP-084), not from guessing.
That document covers a much larger surface (Review Voucher approval, vendor
matching, split bills, sync, bulk uploads, and more) than this suite
automates — this project deliberately stays scoped to the five scenarios
above.

## Fixtures

- `fixtures/sample-bill.pdf` — a minimal, valid single-page PDF used by the
  successful-upload test.
- `fixtures/invalid-attachment.txt` — a plain-text file used by the
  invalid-attachment test to verify the app rejects unsupported file types.
