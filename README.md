# Accounts Payable — Bill Automation

Playwright (TypeScript) end-to-end tests for the Bill workflows of the Accounts
Payable module at `https://app.aiaccountant.com/accounts-payable`.

## Scenarios covered

| Priority | File | Scenario |
|---|---|---|
| High | `tests/create-bill.spec.ts` | Create a bill with multiple line items and verify the total, both on-screen and after save |
| High | `tests/required-field-validation.spec.ts` | Attempting to save an incomplete bill is blocked with validation feedback |
| High | `tests/delete-bill.spec.ts` | Delete flow: cancel keeps the bill, confirm removes it (2 tests) |
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

## A note on locators

This suite was authored in a sandboxed environment where outbound network
access to `app.aiaccountant.com` was blocked by policy, so the real DOM could
not be inspected directly. Locators in `pages/*.ts` are therefore
**best-effort, semantic guesses** (`getByRole`, `getByLabel`, `getByPlaceholder`
with case-insensitive name matching against the field labels named in the
exercise brief — Vendor, Bill Number, Bill Date, Due Date, etc.).

If a locator doesn't match the live app once you run these against it:

1. Run `npx playwright codegen $BASE_URL/accounts-payable` to inspect the real
   accessible name/role/label for the element in question.
2. Update the corresponding getter in `pages/LoginPage.ts`, `pages/BillsListPage.ts`,
   or `pages/BillFormPage.ts` — every test consumes these getters, so a single
   fix there propagates to all specs that use it.
3. Re-run `npm run test:ui` to iterate quickly with the trace viewer.

## Fixtures

- `fixtures/sample-bill.pdf` — a minimal, valid single-page PDF used by the
  successful-upload test.
- `fixtures/invalid-attachment.txt` — a plain-text file used by the
  invalid-attachment test to verify the app rejects unsupported file types.
