import { expect, test, type Page } from '@playwright/test';

const visible = (page: Page) => page.locator('main:not([hidden])');
const onScreen = (page: Page, id: string) => page.locator(`main[data-screen="${id}"]:not([hidden])`);
const tabBar = (page: Page) => page.getByRole('navigation', { name: 'منوی اصلی' });

const noHorizontalOverflow = async (page: Page) =>
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
  ).toBeLessThanOrEqual(0);

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

test('restaurants tab (guest): list, category, open a restaurant, system back keeps category and scroll', async ({
  page,
}) => {
  await tabBar(page).getByRole('button', { name: 'رستوران‌ها' }).click();
  const tab = onScreen(page, 'restaurants');
  await expect(tab.getByRole('heading', { level: 1, name: 'رستوران‌ها' })).toBeVisible();
  const list = tab.getByRole('region', { name: 'لیست رستوران‌ها' });
  await expect(list.getByRole('button', { name: 'کافه گلستان', exact: true })).toBeVisible();
  await noHorizontalOverflow(page);

  await tab
    .getByRole('navigation', { name: 'دسته‌بندی‌ها' })
    .getByRole('button', { name: 'فست‌فود', exact: true })
    .click();
  await expect(list.getByRole('button', { name: 'کافه گلستان', exact: true })).toHaveCount(0);
  const burger = list.getByRole('button', { name: 'برگر لاین', exact: true });
  await burger.scrollIntoViewIfNeeded();
  const before = await tab.evaluate((el) => el.scrollTop);
  await burger.click();
  await expect(onScreen(page, 'restaurant')).toBeVisible();

  await page.goBack();
  await expect(tab).toBeVisible();
  await expect(list.getByRole('button', { name: 'برگر لاین', exact: true })).toBeVisible();
  await expect(list.getByRole('button', { name: 'کافه گلستان', exact: true })).toHaveCount(0);
  expect(await tab.evaluate((el) => el.scrollTop)).toBe(before);
});

test('restaurants tab: shared filter sheet applies and shows the count on the button', async ({ page }) => {
  await tabBar(page).getByRole('button', { name: 'رستوران‌ها' }).click();
  const tab = onScreen(page, 'restaurants');
  await tab.getByRole('button', { name: 'فیلتر و مرتب‌سازی' }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByRole('switch', { name: /باز است/ }).click();
  await sheet
    .getByRole('button', { name: /نمایش|اعمال|رستورانی/ })
    .last()
    .click();
  await expect(tab.getByRole('button', { name: 'فیلتر و مرتب‌سازی، ۱ فیلتر فعال' })).toBeVisible();
  await expect(
    tab.getByRole('region', { name: 'لیست رستوران‌ها' }).getByRole('button', { name: 'کافه گلستان' }),
  ).toHaveCount(0);
});

test('offers tab (guest) → campaign → restaurant; system back returns step by step', async ({ page }) => {
  await tabBar(page).getByRole('button', { name: 'تخفیف‌ها' }).click();
  const offers = onScreen(page, 'offers');
  await expect(offers.getByRole('heading', { level: 1, name: 'تخفیف‌ها' })).toBeVisible();
  await expect(
    offers.getByRole('region', { name: 'کدهای تخفیف' }).getByRole('button', { name: 'استفاده کد DOKOON10' }),
  ).toBeVisible();
  await expect(offers.getByRole('region', { name: 'رستوران‌های تخفیف‌دار' })).toBeVisible();
  await noHorizontalOverflow(page);

  await offers
    .getByRole('region', { name: 'کمپین‌ها' })
    .getByRole('button', { name: /هفته‌ی طعم‌های شهرضا/ })
    .click();
  const camp = onScreen(page, 'campaign');
  await expect(camp.getByRole('heading', { level: 1, name: 'هفته‌ی طعم‌های شهرضا' })).toBeVisible();
  const rests = camp.getByRole('region', { name: 'رستوران‌های این کمپین' });
  await expect(rests.getByRole('button', { name: 'کافه گلستان', exact: true })).toBeVisible();
  await noHorizontalOverflow(page);

  await rests.getByRole('button', { name: 'برگر لاین', exact: true }).click();
  await expect(onScreen(page, 'restaurant')).toBeVisible();
  await page.goBack();
  await expect(camp).toBeVisible();
  await camp.getByRole('button', { name: 'بازگشت' }).click();
  await expect(offers).toBeVisible();
});

test('restaurants and offers render in dark theme', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await tabBar(page).getByRole('button', { name: 'تخفیف‌ها' }).click();
  await expect(onScreen(page, 'offers').getByRole('region', { name: 'کمپین‌ها' })).toBeVisible();
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).not.toBe('rgb(255, 255, 255)');
});
