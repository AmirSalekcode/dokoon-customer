import { expect, test } from '@playwright/test';
import { seedSession, SHIFT_BUTTON } from './helpers';

// KAN-61: «شروع شیفت» unlocks real Web Audio with our own sound file; «صدا و هشدار» screen.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('dk-mock-neworder-ms', '0'));
  await seedSession(page);
});

test('shift start → our alert file is loaded, orders open, toast confirms', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('list', { name: 'نکته‌های شیفت' }).getByRole('listitem')).toHaveCount(3);
  const sound = page.waitForResponse((r) => r.url().endsWith('/sounds/new-order.wav'));
  await page.getByRole('button', { name: SHIFT_BUTTON }).click();
  expect((await sound).status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name: 'کبابی سنتی زاگرس' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('شیفت شروع شد');
});

test('sound screen: preview, levels, repeat; back returns to the account tab', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: SHIFT_BUTTON }).click();
  await page
    .getByRole('navigation', { name: 'بخش‌های رستوران' })
    .getByRole('button', { name: 'حساب' })
    .click();
  const main = page.locator('main:not([hidden])');
  await main.getByRole('button', { name: /صدا و هشدار/ }).click();
  await expect(main.getByRole('heading', { name: 'صدا و هشدار' })).toBeVisible();

  await main.getByRole('button', { name: 'پخش صدای سفارش جدید' }).click();
  await expect(main.getByRole('button', { name: 'توقف صدا' })).toBeVisible();
  await expect(main.getByRole('button', { name: 'پخش صدای سفارش جدید' })).toBeVisible({ timeout: 6000 });

  await main.getByRole('radio', { name: 'سطح ۵' }).click();
  await expect(main.getByRole('radio', { name: 'سطح ۵' })).toHaveAttribute('aria-checked', 'true');
  await page.reload();
  await page.getByRole('button', { name: SHIFT_BUTTON }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('dk-r-sound') ?? '{}').level)).toBe(5);

  await page
    .getByRole('navigation', { name: 'بخش‌های رستوران' })
    .getByRole('button', { name: 'حساب' })
    .click();
  await main.getByRole('button', { name: /صدا و هشدار/ }).click();
  await page.goBack();
  await expect(main).toHaveAttribute('data-screen', 'account');
});
