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
  await visible(page).getByRole('button', { name: 'کباب‌سرای نقش‌جهان', exact: true }).first().click();
  await expect(visible(page).getByRole('heading', { level: 1, name: 'کباب‌سرای نقش‌جهان' })).toBeVisible();
});

test('restaurant: sticky chips jump, search filters, no horizontal overflow at 390', async ({ page }) => {
  const tabs = visible(page).getByRole('navigation', { name: 'دسته‌بندی منو' });
  await tabs.getByRole('button', { name: 'خورشت‌ها' }).click();
  await expect(visible(page).getByRole('heading', { level: 2, name: 'خورشت‌ها' })).toBeInViewport();
  await expect(tabs).toBeInViewport();
  const search = visible(page).getByLabel('جستجو در منوی رستوران');
  await search.fill('برگ');
  await expect(visible(page).getByRole('button', { name: 'کباب برگ', exact: true })).toBeVisible();
  await expect(visible(page).getByRole('button', { name: 'چلو کباب کوبیده', exact: true })).toHaveCount(0);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('add to cart shows the cart bar; it opens the cart', async ({ page }) => {
  await visible(page).getByRole('button', { name: 'افزودن کباب برگ به سبد' }).click();
  const bar = visible(page).getByRole('button', { name: /مشاهده سبد خرید/ });
  await expect(bar).toContainText('۴۲۰٬۰۰۰');
  await bar.click();
  await expect(page.locator('main[data-screen="cart"]:not([hidden])')).toBeVisible();
});

test('food sheet shows reviews and loads more on scroll; system back closes it', async ({ page }) => {
  await visible(page).getByRole('button', { name: 'چلو کباب کوبیده', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'جزئیات چلو کباب کوبیده' });
  const list = sheet.getByRole('list', { name: 'نظرات کاربران' });
  await expect(list.getByRole('listitem')).toHaveCount(5);
  await sheet.getByTestId('food-body').evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await expect(list.getByRole('listitem')).toHaveCount(10);
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(visible(page).getByRole('heading', { level: 1, name: 'کباب‌سرای نقش‌جهان' })).toBeVisible();
});

test('restinfo: details, then back returns to the restaurant (system back too)', async ({ page }) => {
  await visible(page).getByRole('button', { name: 'اطلاعات رستوران و ساعت کاری' }).click();
  const info = page.locator('main[data-screen="restinfo"]:not([hidden])');
  await expect(info.getByRole('region', { name: 'مشخصات رستوران' })).toContainText('۱۱:۰۰ تا ۲۳:۰۰');
  await expect(info.getByRole('link', { name: /تماس با/ })).toHaveAttribute('href', 'tel:03100000001');
  await page.goBack();
  await expect(visible(page).getByRole('heading', { level: 1, name: 'کباب‌سرای نقش‌جهان' })).toBeVisible();
});

test('a shared restaurant link opens that restaurant; back goes to home', async ({ page }) => {
  await page.goto('/?restaurant=burger');
  await expect(visible(page).getByRole('heading', { level: 1, name: 'برگر لاین' })).toBeVisible();
  expect(new URL(page.url()).search).toBe('');
  await page.goBack();
  await expect(visible(page).getByRole('heading', { name: 'نزدیک شما' })).toBeVisible();
});
