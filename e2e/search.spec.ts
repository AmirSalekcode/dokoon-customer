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
  // Guest (D-59): search works without logging in.
  await visible(page).getByRole('button', { name: 'دنبال چه رستوران یا غذایی؟' }).click();
  await expect(visible(page).getByRole('heading', { level: 1, name: 'جستجو' })).toBeVisible();
});

test('search: popular chip → results; food opens restaurant + sheet; system back keeps the query', async ({
  page,
}) => {
  const box = visible(page).getByRole('searchbox', { name: 'رستوران یا غذا را جستجو کنید' });
  await visible(page)
    .getByRole('region', { name: 'جستجوهای محبوب' })
    .getByRole('button', { name: 'پیتزا' })
    .click();
  await expect(box).toHaveValue('پیتزا');
  const foods = visible(page).getByRole('region', { name: 'غذاها' });
  await foods.getByRole('button', { name: /پیتزا پپرونی/ }).click();
  await expect(page.locator('main[data-screen="restaurant"]:not([hidden])')).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'جزئیات پیتزا پپرونی' })).toBeVisible();

  await page.goBack(); // closes the food sheet
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goBack(); // back to search, same text and results
  await expect(page.locator('main[data-screen="search"]:not([hidden])')).toBeVisible();
  await expect(box).toHaveValue('پیتزا');
  await expect(visible(page).getByRole('region', { name: 'غذاها' })).toBeVisible();
  await expect(visible(page).getByRole('region', { name: 'جستجوهای اخیر' })).toHaveCount(0);

  await box.fill('');
  await expect(
    visible(page).getByRole('region', { name: 'جستجوهای اخیر' }).getByRole('button', { name: 'پیتزا' }),
  ).toBeVisible();
  await page.goBack();
  await expect(page.locator('main[data-screen="home"]:not([hidden])')).toBeVisible();
});

test('search: no result, filters from the shared sheet, no horizontal overflow at 390', async ({ page }) => {
  const box = visible(page).getByRole('searchbox', { name: 'رستوران یا غذا را جستجو کنید' });
  await box.fill('سوشی');
  await expect(visible(page).getByRole('heading', { name: 'نتیجه‌ای پیدا نشد' })).toBeVisible();

  await box.fill('کافه');
  await expect(visible(page).getByRole('region', { name: 'رستوران‌ها' })).toContainText('کافه گلستان');
  await visible(page).getByRole('button', { name: 'فیلتر و مرتب‌سازی' }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByRole('switch', { name: /باز است/ }).click();
  await sheet
    .getByRole('button', { name: /نمایش|اعمال|رستورانی/ })
    .last()
    .click();
  await expect(visible(page).getByRole('heading', { name: 'نتیجه‌ای با این فیلترها نیست' })).toBeVisible();
  await visible(page).getByRole('button', { name: 'حذف فیلترها' }).click();
  await expect(visible(page).getByRole('region', { name: 'رستوران‌ها' })).toContainText('کافه گلستان');

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
