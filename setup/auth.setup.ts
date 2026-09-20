import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { LoginPage } from '../pages/LoginPage';

const AUTH_FILE = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  if (!email || !password) {
    throw new Error('TEST_USER_EMAIL and TEST_USER_PASSWORD must be set. Copy .env.example to .env and fill them in.');
  }

  await page.goto('/accounts-payable');

  const loginPage = new LoginPage(page);
  if (await loginPage.isDisplayed()) {
    await loginPage.login(email, password);
  }

  await expect(page.getByRole('table').or(page.getByRole('heading', { name: /bills|accounts payable/i }))).toBeVisible({
    timeout: 20_000,
  });

  await page.context().storageState({ path: AUTH_FILE });
});
