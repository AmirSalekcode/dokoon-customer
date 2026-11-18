import { expect, test, type Page } from '@playwright/test';

const screen = (page: Page, id: string) => page.locator(`main[data-screen="${id}"]:not([hidden])`);

async function openAccount(page: Page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    const set = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));
    set('dk-consent', { version: 1, analytics: false, decidedAt: '2026-11-18' });
    set('dk-launch', { seenOnboarding: true, cityId: 'shahreza' });
    set('dk-session', { accessToken: 'a', refreshToken: 'r', user: null });
  });
  await page.goto('/');
  await page.getByRole('navigation', { name: 'منوی اصلی' }).getByRole('button', { name: 'حساب' }).click();
  await expect(screen(page, 'account').getByText('سلام امیر عزیز')).toBeVisible();
}

test('account: badges, past order → reorder fills the cart', async ({ page }) => {
  await openAccount(page);
  const acc = screen(page, 'account');
  await expect(acc.getByRole('button', { name: /^اعلان‌ها/ })).toContainText('۲');
  await acc.getByRole('button', { name: /^سفارش‌ها/ }).click();
  const orders = screen(page, 'orders');
  await expect(orders.getByRole('button', { name: /سفارش ۱۰۲۵۴/ })).toBeVisible();
  await orders.getByRole('tab', { name: 'گذشته' }).click();
  await orders.getByRole('button', { name: 'سفارش مجدد' }).click();
  await expect(screen(page, 'cart').getByRole('heading', { name: 'برگر لاین' })).toBeVisible();
});

test('notifications: tap marks read and opens the order; back returns', async ({ page }) => {
  await openAccount(page);
  await screen(page, 'account')
    .getByRole('button', { name: /^اعلان‌ها/ })
    .click();
  await screen(page, 'notifs')
    .getByRole('button', { name: /سفارش شما در حال آماده شدن است/ })
    .click();
  await expect(screen(page, 'track').getByRole('heading', { level: 1 })).toBeVisible();
  await page.goBack();
  await expect(
    screen(page, 'notifs').getByRole('button', { name: /^خوانده‌نشده.*سفارش شما در حال آماده/ }),
  ).toHaveCount(0);
});

test('edit profile name, then greeting updates', async ({ page }) => {
  await openAccount(page);
  await screen(page, 'account').getByRole('button', { name: 'ویرایش پروفایل' }).click();
  const ed = screen(page, 'editprof');
  await ed.getByLabel('نام و نام خانوادگی').fill('امیر رضایی');
  await ed.getByRole('button', { name: 'ذخیره' }).click();
  await expect(screen(page, 'account').getByText('سلام امیر رضایی عزیز')).toBeVisible();
});

test('settings: notification switch persists across visits', async ({ page }) => {
  await openAccount(page);
  await screen(page, 'account')
    .getByRole('button', { name: /^تنظیمات/ })
    .click();
  const sw = screen(page, 'settings').getByRole('switch', { name: 'اخبار دکون' });
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  await page.goBack();
  await screen(page, 'account')
    .getByRole('button', { name: /^تنظیمات/ })
    .click();
  await expect(screen(page, 'settings').getByRole('switch', { name: 'اخبار دکون' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
});
