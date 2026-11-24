import { expect, test, type Page } from '@playwright/test';

// KAN-110 (D-131): food discount / festival in the customer app (mock: n1 «۱۰٪ تخفیف», b1 «جشنواره ۲۰٪»).
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
});

async function openRestaurant(page: Page, name: string) {
  await visible(page).getByRole('button', { name, exact: true }).first().click();
  await expect(visible(page).getByRole('heading', { level: 1, name })).toBeVisible();
}

test('menu card: struck old price and «۱۰٪ تخفیف»; restaurant card «تا ۱۰٪ تخفیف»', async ({ page }) => {
  await expect(visible(page).getByText('تا ۱۰٪ تخفیف', { exact: true }).first()).toBeVisible();
  await openRestaurant(page, 'کباب‌سرای نقش‌جهان');
  const card = visible(page).getByRole('button', { name: 'چلو کباب کوبیده', exact: true });
  await expect(card.getByText('۱۰٪ تخفیف', { exact: true })).toBeVisible();
  await expect(card.locator('s')).toHaveText('۳۲۰٬۰۰۰');
  await expect(card.getByText('قیمت قبلی ۳۲۰٬۰۰۰، قیمت با ۱۰٪ تخفیف ۲۸۵٬۰۰۰ تومان')).toBeAttached();
  // A food without a discount has no badge.
  await expect(
    visible(page).getByRole('button', { name: 'کباب برگ', exact: true }).getByText(/تخفیف/),
  ).toHaveCount(0);
});

test('festival: badge and end text in the food sheet; added to the cart at the discounted price', async ({
  page,
}) => {
  await openRestaurant(page, 'برگر لاین');
  await visible(page).getByRole('button', { name: 'چیزبرگر دوبل', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'جزئیات چیزبرگر دوبل' });
  await expect(sheet.getByText('جشنواره ۲۰٪', { exact: true })).toBeVisible();
  await expect(sheet.getByText('تا ۳ روز دیگر', { exact: true })).toBeVisible();
  await sheet.getByRole('radio', { name: /کوچک/ }).check();
  await sheet.getByRole('button', { name: /افزودن به سبد/ }).click();

  await visible(page)
    .getByRole('button', { name: /مشاهده سبد خرید/ })
    .click();
  const cart = page.locator('main[data-screen="cart"]:not([hidden])');
  await expect(cart.locator('s').filter({ hasText: '۳۲۵٬۰۰۰' })).toBeVisible();
  const summary = cart.getByRole('region', { name: 'خلاصه‌ی پرداخت' });
  await expect(summary).toContainText('جمع غذاها۲۶۰٬۰۰۰ تومان');
});

test('search result shows the discount badge and the struck price', async ({ page }) => {
  await visible(page).getByRole('button', { name: 'دنبال چه رستوران یا غذایی؟' }).click();
  await visible(page).getByRole('searchbox', { name: 'رستوران یا غذا را جستجو کنید' }).fill('کوبیده');
  const row = visible(page)
    .getByRole('region', { name: 'غذاها' })
    .getByRole('button', { name: /چلو کباب کوبیده/ });
  await expect(row.getByText('۱۰٪ تخفیف', { exact: true })).toBeVisible();
  await expect(row.locator('s')).toContainText('۳۲۰٬۰۰۰');
});

test('a discount that ends while in the cart → «قیمت یا موجودی تغییر کرد» and the base price', async ({
  page,
}) => {
  await openRestaurant(page, 'کباب‌سرای نقش‌جهان');
  await visible(page).getByRole('button', { name: 'چلو کباب کوبیده', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'جزئیات چلو کباب کوبیده' })
    .getByRole('button', { name: /افزودن به سبد/ })
    .click();
  await page.evaluate(() => localStorage.setItem('dk-mock-ended-discounts', 'n1'));
  await visible(page)
    .getByRole('button', { name: /مشاهده سبد خرید/ })
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: 'قیمت یا موجودی تغییر کرد؛ سفارش را دوباره بررسی کنید.' }),
  ).toBeVisible();
  const cart = page.locator('main[data-screen="cart"]:not([hidden])');
  await expect(cart.getByRole('region', { name: 'خلاصه‌ی پرداخت' })).toContainText('جمع غذاها۳۲۰٬۰۰۰ تومان');
  await expect(cart.locator('s')).toHaveCount(0);
});
