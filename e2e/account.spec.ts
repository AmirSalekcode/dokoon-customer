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

test('about → legal (terms/privacy): sections expand; system back returns step by step', async ({ page }) => {
  await openAccount(page);
  await screen(page, 'account')
    .getByRole('button', { name: /^درباره ما و قوانین/ })
    .click();
  const about = screen(page, 'about');
  await expect(about.getByText(/سفارش آنلاین غذا از رستوران‌ها/)).toBeVisible();
  await expect(about.getByText('نسخه‌ی ۰٫۱٫۰')).toBeVisible();
  await about.getByRole('button', { name: /^حریم خصوصی/ }).click();
  const legal = screen(page, 'legal');
  await expect(legal.getByRole('heading', { level: 1, name: 'حریم خصوصی' })).toBeVisible();
  await expect(legal.getByText(/متن پیش‌نویس/)).toBeVisible();
  const sec = legal.getByRole('button', { name: 'نحوه‌ی استفاده' });
  await sec.click();
  await expect(sec).toHaveAttribute('aria-expanded', 'true');
  await expect(legal.getByText(/فقط برای ثبت، ارسال و پشتیبانی سفارش/)).toBeVisible();
  expect(await page.evaluate(() => document.scrollingElement!.scrollWidth)).toBeLessThanOrEqual(390);
  await page.goBack();
  await expect(about).toBeVisible();
  await about.getByRole('button', { name: /^قوانین و مقررات/ }).click();
  await expect(
    screen(page, 'legal').getByRole('heading', { level: 1, name: 'قوانین و مقررات' }),
  ).toBeVisible();
  await page.goBack();
  await page.goBack();
  await expect(screen(page, 'account')).toBeVisible();
});

test('soon: coming-soon page from the dev preview; «بازگشت» returns to settings', async ({ page }) => {
  await openAccount(page);
  await screen(page, 'account')
    .getByRole('button', { name: /^تنظیمات/ })
    .click();
  await screen(page, 'settings').getByRole('button', { name: 'soon', exact: true }).click();
  const soon = screen(page, 'soon');
  await expect(soon.getByRole('heading', { name: 'به‌زودی در دکون' })).toBeVisible();
  await soon.getByRole('button', { name: 'بازگشت', exact: true }).last().click();
  await expect(screen(page, 'settings')).toBeVisible();
});
