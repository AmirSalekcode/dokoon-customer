import { expect, test, type Page } from '@playwright/test';
import { allowDevice, signIn } from './helpers';

// KAN-92 (CP-08): after approval the device-permissions page stands in front of the orders tab until
// location and notifications are allowed; the account tab opens it again as a normal page.
const top = (page: Page) => page.locator('main:not([hidden])');
const cont = (page: Page) => top(page).getByRole('button', { name: 'ادامه', exact: true });

test('without permissions: the permissions page, «ادامه» disabled; a refused prompt explains the fix', async ({
  page,
}) => {
  await page.goto('/');
  await signIn(page);
  await expect(top(page)).toHaveAttribute('data-screen', 'perm');
  await expect(top(page).getByRole('region', { name: 'موقعیت مکانی' })).toContainText('لازم است');
  // The web has no battery setting.
  await expect(top(page).getByRole('region', { name: 'عدم محدودیت باتری' })).toHaveCount(0);
  await expect(cont(page)).toBeDisabled();
  // Playwright refuses prompts that were not granted.
  await top(page)
    .getByRole('region', { name: 'موقعیت مکانی' })
    .getByRole('button', { name: 'اجازه می‌دهم' })
    .click();
  await expect(top(page).getByRole('region', { name: 'موقعیت مکانی' })).toContainText('اجازه بسته شده است');
  await expect(cont(page)).toBeDisabled();
});

test('with location and notifications allowed «ادامه» opens the orders tab', async ({ page }) => {
  await page.goto('/');
  await signIn(page);
  await expect(top(page)).toHaveAttribute('data-screen', 'perm');
  await allowDevice(page);
  // Back from the system settings: the page re-reads the states.
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(top(page).getByRole('region', { name: 'موقعیت مکانی' })).toContainText('فعال');
  await expect(cont(page)).toBeEnabled();
  expect((await cont(page).boundingBox())!.height).toBeGreaterThanOrEqual(56);
  await cont(page).click();
  await expect(top(page)).toHaveAttribute('data-screen', 'orders');
});

test('account → «مجوزهای دستگاه» opens the page with back', async ({ page }) => {
  await allowDevice(page);
  await page.goto('/');
  await signIn(page);
  await expect(top(page)).toHaveAttribute('data-screen', 'orders');
  await page.getByRole('navigation', { name: 'بخش‌های پیک' }).getByRole('button', { name: 'حساب' }).click();
  await page.getByRole('button', { name: /مجوزهای دستگاه/ }).click();
  await expect(top(page)).toHaveAttribute('data-screen', 'perm');
  await expect(cont(page)).toHaveCount(0);
  await page.goBack();
  await expect(top(page)).toHaveAttribute('data-screen', 'account');
});
