import { expect, test } from '@playwright/test';

// Cookie popup is covered elsewhere; decide it so it doesn't cover the buttons.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('dk-consent'))
      localStorage.setItem(
        'dk-consent',
        JSON.stringify({ version: 1, analytics: false, decidedAt: '2026-11-18' }),
      );
  });
});

const visible = (page: import('@playwright/test').Page) => page.locator('main:not([hidden])');

test('first launch: splash → onboarding → city → home, with no login (guest browsing)', async ({ page }) => {
  await page.goto('/');
  await expect(visible(page).getByText('غذای محبوبت، دم در خونه‌ات')).toBeVisible();
  await expect(visible(page).getByRole('heading', { name: 'غذای محبوبت، دم در خونه‌ات' })).toBeVisible();
  await visible(page).getByRole('button', { name: 'بعدی' }).click();
  await expect(visible(page).getByRole('heading', { name: 'سفارش ساده، پرداخت امن' })).toBeVisible();
  await visible(page).getByRole('button', { name: 'رد کردن' }).click();
  await expect(visible(page).getByRole('heading', { name: 'انتخاب شهر' })).toBeVisible();
  await expect(visible(page).getByRole('radio', { name: 'شهرضا' })).toHaveAttribute('aria-checked', 'true');
  await visible(page).getByRole('button', { name: 'تأیید و ادامه' }).click();
  await expect(visible(page).getByRole('heading', { name: 'نزدیک شما' })).toBeVisible();
  // Nothing behind home: back warns before exiting (onboarding/city are not in the stack).
  await page.goBack();
  await expect(page.getByText('برای خروج دوباره بزنید')).toBeVisible();
});

test('second launch skips onboarding and city', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('dk-launch', JSON.stringify({ seenOnboarding: true, cityId: 'shahreza' })),
  );
  await page.goto('/');
  await expect(visible(page).getByRole('heading', { name: 'نزدیک شما' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'انتخاب شهر' })).toHaveCount(0);
});

test('city can be changed from settings and returns there', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('dk-launch', JSON.stringify({ seenOnboarding: true, cityId: 'shahreza' })),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'حساب' }).click();
  await visible(page)
    .getByRole('button', { name: /تنظیمات/ })
    .click();
  await visible(page).getByRole('button', { name: /^شهر/ }).click();
  await expect(visible(page).getByRole('heading', { name: 'انتخاب شهر' })).toBeVisible();
  await visible(page).getByRole('button', { name: 'تأیید و ادامه' }).click();
  await expect(visible(page).getByRole('heading', { name: 'تنظیمات' })).toBeVisible();
});
