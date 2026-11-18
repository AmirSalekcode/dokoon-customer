import { expect, test, type Page } from '@playwright/test';

const visible = (page: Page) => page.locator('main:not([hidden])');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('dk-consent'))
      localStorage.setItem(
        'dk-consent',
        JSON.stringify({ version: 1, analytics: false, decidedAt: '2026-11-18' }),
      );
    if (!localStorage.getItem('dk-launch'))
      localStorage.setItem('dk-launch', JSON.stringify({ seenOnboarding: true, cityId: 'shahreza' }));
  });
  await page.goto('/');
  await expect(visible(page).getByRole('heading', { name: 'نزدیک شما' })).toBeVisible();
});

test('home shows banners, categories and sections; address chip shows the city', async ({ page }) => {
  await expect(visible(page).getByRole('region', { name: 'پیشنهادهای ویژه' })).toBeVisible();
  await expect(visible(page).getByRole('navigation', { name: 'دسته‌بندی‌ها' })).toBeVisible();
  await expect(visible(page).getByRole('button', { name: /آدرس تحویل: شهرضا/ })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('category → filtered grid; back to «همه» restores sections', async ({ page }) => {
  const cats = visible(page).getByRole('navigation', { name: 'دسته‌بندی‌ها' });
  await cats.getByRole('button', { name: 'کافه', exact: true }).click();
  const results = visible(page).getByRole('region', { name: 'نتایج' });
  await expect(results.getByRole('heading', { name: '۱ رستوران' })).toBeVisible();
  await expect(results.getByRole('button', { name: 'کافه گلستان', exact: true })).toBeVisible();
  await cats.getByRole('button', { name: 'همه', exact: true }).click();
  await expect(visible(page).getByRole('heading', { name: 'نزدیک شما' })).toBeVisible();
});

test('filter sheet: live count, apply, badge on the filter button; system back closes it', async ({
  page,
}) => {
  await visible(page).getByRole('button', { name: 'فیلتر و مرتب‌سازی' }).click();
  const sheet = page.getByRole('dialog', { name: 'فیلتر و مرتب‌سازی' });
  await expect(sheet.getByRole('button', { name: 'نمایش ۳ رستوران' })).toBeVisible();
  await sheet.getByRole('switch', { name: /باز است/ }).click();
  await sheet.getByRole('button', { name: 'نمایش ۲ رستوران' }).click();
  await expect(sheet).toHaveCount(0);
  await expect(visible(page).getByRole('button', { name: 'فیلتر و مرتب‌سازی، ۱ فیلتر فعال' })).toBeVisible();
  await expect(visible(page).getByRole('heading', { name: '۲ رستوران' })).toBeVisible();
  // Re-open and leave with system back: nothing changes
  await visible(page)
    .getByRole('button', { name: /فیلتر و مرتب‌سازی/ })
    .click();
  await page
    .getByRole('dialog', { name: 'فیلتر و مرتب‌سازی' })
    .getByRole('switch', { name: /تخفیف‌دار/ })
    .click();
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(visible(page).getByRole('heading', { name: '۲ رستوران' })).toBeVisible();
});

test('banner «سفارش بده» opens its restaurant', async ({ page }) => {
  const banner = visible(page).getByRole('group', { name: 'کباب داغ، دم در خونه‌ات' });
  await banner.getByRole('button', { name: 'سفارش بده' }).click();
  await expect(visible(page).getByRole('heading', { name: 'کباب‌سرای نقش‌جهان', level: 1 })).toBeVisible();
});

test('favorite as a guest → login screen', async ({ page }) => {
  await visible(page).getByRole('button', { name: 'افزودن برگر لاین به علاقه‌مندی‌ها' }).first().click();
  await expect(visible(page).getByRole('heading', { name: 'ورود یا ثبت‌نام' })).toBeVisible();
});
