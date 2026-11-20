import { expect, test, type Page } from '@playwright/test';

// KAN-58 / D-106: all nine full-page errors of the restaurant panel.
const heading = (page: Page, name: string | RegExp) => page.getByRole('heading', { name });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('dk-mock-neworder-ms', '0'));
});

const BY_STATUS: [string, string, string][] = [
  ['401', 'نشست شما منقضی شده', 'ورود دوباره'],
  ['403', 'اجازه‌ی دسترسی ندارید', 'بازگشت به خانه'],
  ['404', 'صفحه پیدا نشد', 'بازگشت به خانه'],
  ['500', 'مشکلی در سرور پیش آمده', 'تلاش دوباره'],
  ['502', 'مشکلی در سرور پیش آمده', 'تلاش دوباره'],
  ['503', 'سرویس موقتاً در دسترس نیست', 'تلاش دوباره'],
  ['504', 'پاسخ از سرور دیر رسید', 'تلاش دوباره'],
];

for (const [status, title, cta] of BY_STATUS) {
  test(`HTTP ${status} → «${title}»`, async ({ page }) => {
    await page.addInitScript((s) => localStorage.setItem('dk-mock-status', s), status);
    await page.goto('/');
    await expect(heading(page, title)).toBeVisible();
    await expect(page.getByRole('button', { name: cta })).toBeVisible();
    await expect(page.getByRole('banner')).toHaveCount(0);
  });
}

test('403 «بازگشت به خانه» → orders tab', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('dk-mock-status', '403'));
  await page.goto('/');
  await expect(heading(page, 'اجازه‌ی دسترسی ندارید')).toBeVisible();
  await page.evaluate(() => localStorage.removeItem('dk-mock-status'));
  await page.getByRole('button', { name: 'بازگشت به خانه' }).click();
  await expect(page.locator('main:not([hidden])')).toHaveAttribute('data-screen', 'orders');
});

test('500 «تماس با پشتیبانی» → help', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('dk-mock-status', '500'));
  await page.goto('/');
  await page.getByRole('button', { name: 'تماس با پشتیبانی' }).click();
  await expect(heading(page, 'راهنما و پشتیبانی')).toBeVisible();
});

test('500 «تلاش دوباره» repeats the request and recovers', async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seen')) {
      sessionStorage.setItem('seen', '1');
      localStorage.setItem('dk-mock-status', '500');
    }
  });
  await page.goto('/');
  await expect(heading(page, 'مشکلی در سرور پیش آمده')).toBeVisible();
  await page.evaluate(() => localStorage.removeItem('dk-mock-status'));
  await page.getByRole('button', { name: 'تلاش دوباره' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'کبابی سنتی زاگرس' })).toBeVisible();
});

test('offline (network cut) → offline page; back online → returns', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('banner')).toBeVisible();
  await context.setOffline(true);
  await expect(heading(page, 'اینترنت متصل نیست')).toBeVisible();
  await expect(page.getByText(/برای دریافت سفارش‌ها/)).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByRole('banner')).toBeVisible();
});

for (const [cfg, title, cta] of [
  ['{"maintenance":true}', /در حال به‌روزرسانی/, 'تلاش دوباره'],
  ['{"minVersion":"99.0.0"}', /نسخه‌ی جدید/, 'به‌روزرسانی'],
] as const) {
  test(`GET /app/config ${cfg} blocks the panel and back cannot dismiss it`, async ({ page }) => {
    await page.addInitScript((c) => localStorage.setItem('dk-mock-config', c), cfg);
    await page.goto('/');
    await expect(heading(page, title)).toBeVisible();
    await expect(page.getByRole('button', { name: cta })).toBeVisible();
    await page.goBack();
    await expect(heading(page, title)).toBeVisible();
    await expect(page.getByRole('banner')).toHaveCount(0);
  });
}
