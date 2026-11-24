import { expect, test, type Page } from '@playwright/test';
import { openCourier } from './helpers';

// KAN-100 (CP-16): account tab card, «اطلاعات من» (server-masked values), Sheba change request with a
// fresh code to the courier's own mobile; exact back.
const top = (page: Page) => page.locator('main:not([hidden])');
const tab = (page: Page, name: string) =>
  page.getByRole('navigation', { name: 'بخش‌های پیک' }).getByRole('button', { name });
const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test('card → my info → Sheba change request → under review; back is exact', async ({ page }) => {
  await page.clock.install();
  await openCourier(page);
  // The login code went to the same mobile moments ago; codes are 120 s apart.
  await page.clock.fastForward('02:05');
  await tab(page, 'حساب').click();
  const card = top(page).getByRole('region', { name: 'کارت پیک' });
  await expect(card).toContainText('مهدی کریمی');
  await expect(card).toContainText('۰۹۱۳•••۴۵۶۷');

  await top(page)
    .getByRole('button', { name: /اطلاعات من/ })
    .click();
  await expect(top(page)).toHaveAttribute('data-screen', 'info');
  await expect(top(page)).toContainText('۰۰۷*****۱۲');
  await top(page).getByRole('button', { name: 'درخواست تغییر شبا' }).click();
  await expect(top(page)).toHaveAttribute('data-screen', 'sheba');
  await top(page).getByLabel('شماره‌ی شبای تازه').fill('IR062960000000100324200001');
  await top(page).getByRole('button', { name: 'ارسال کد تأیید' }).click();
  await top(page).getByLabel('کد تأیید پیامکی').fill('1234');
  await top(page).getByRole('button', { name: 'ثبت درخواست تغییر شبا' }).click();
  await expect(top(page)).toHaveAttribute('data-screen', 'info');
  await expect(top(page).getByRole('status')).toContainText('در حال بررسی');

  await page.goBack();
  await expect(top(page)).toHaveAttribute('data-screen', 'account');
  expect(await overflow(page)).toBeLessThanOrEqual(0);
});

test.describe('dark, tablet 1024', () => {
  test.use({ viewport: { width: 1024, height: 768 }, colorScheme: 'dark' });
  test('account and my info stay centred without horizontal scroll', async ({ page }) => {
    await openCourier(page);
    await tab(page, 'حساب').click();
    await expect(top(page).getByRole('region', { name: 'کارت پیک' })).toContainText('مهدی کریمی');
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await top(page)
      .getByRole('button', { name: /اطلاعات من/ })
      .click();
    await expect(top(page)).toContainText('پلاک موتور');
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
});

test('a code asked for right after login shows the wait message from the server', async ({ page }) => {
  await openCourier(page);
  await tab(page, 'حساب').click();
  await top(page)
    .getByRole('button', { name: /اطلاعات من/ })
    .click();
  await top(page).getByRole('button', { name: 'درخواست تغییر شبا' }).click();
  await top(page).getByLabel('شماره‌ی شبای تازه').fill('IR062960000000100324200001');
  await top(page).getByRole('button', { name: 'ارسال کد تأیید' }).click();
  await expect(top(page).getByRole('alert')).toContainText('کمی بعد دوباره تلاش کنید');
});
