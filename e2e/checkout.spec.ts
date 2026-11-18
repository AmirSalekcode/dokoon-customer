import { expect, test, type Page } from '@playwright/test';

const visible = (page: Page) => page.locator('main:not([hidden])');
const screen = (page: Page, id: string) => page.locator(`main[data-screen="${id}"]:not([hidden])`);

async function seed(page: Page, { loggedIn }: { loggedIn: boolean }) {
  await page.addInitScript(
    ({ loggedIn }) => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem(
        'dk-consent',
        JSON.stringify({ version: 1, analytics: false, decidedAt: '2026-11-18' }),
      );
      localStorage.setItem('dk-launch', JSON.stringify({ seenOnboarding: true, cityId: 'shahreza' }));
      localStorage.setItem(
        'dk-cart',
        JSON.stringify({
          restaurant: { id: 'naghsh', name: 'کباب‌سرای نقش‌جهان' },
          lines: [{ lineId: 'n2', foodId: 'n2', title: 'کباب برگ', unitPrice: 420000, qty: 1, options: [] }],
          note: '',
          promoCode: '',
        }),
      );
      if (loggedIn)
        localStorage.setItem(
          'dk-session',
          JSON.stringify({ accessToken: 'mock-access', refreshToken: 'mock-refresh', user: null }),
        );
    },
    { loggedIn },
  );
  await page.goto('/');
  await expect(visible(page).getByRole('heading', { name: 'نزدیک شما' })).toBeVisible();
  await page.getByRole('navigation', { name: 'منوی اصلی' }).getByRole('button', { name: /سبد/ }).click();
  await expect(screen(page, 'cart').getByRole('heading', { name: 'کباب‌سرای نقش‌جهان' })).toBeVisible();
}

test('cart: server totals, promo code, guest is sent to login at checkout', async ({ page }) => {
  await seed(page, { loggedIn: false });
  const cart = screen(page, 'cart');
  const sum = cart.getByRole('region', { name: 'خلاصه‌ی پرداخت' });
  await expect(sum).toContainText('۴۶۵٬۰۰۰');
  await cart.getByLabel('کد تخفیف').fill('DOKOON10');
  await cart.getByRole('button', { name: 'اعمال' }).click();
  await expect(cart.getByText('کد تخفیف اعمال شد')).toBeVisible();
  await expect(sum).toContainText('۴۲۳٬۰۰۰');
  await cart.getByRole('button', { name: /ادامه و تکمیل سفارش/ }).click();
  await expect(screen(page, 'login')).toBeVisible();
});

test('checkout: add an address, pay cash → paid; back goes home', async ({ page }) => {
  await seed(page, { loggedIn: true });
  await screen(page, 'cart')
    .getByRole('button', { name: /ادامه و تکمیل سفارش/ })
    .click();
  const co = screen(page, 'checkout');
  await expect(co.getByRole('region', { name: 'زمان تحویل' })).toContainText(
    'ارسال حدود ۲۵ تا ۳۵ دقیقه‌ی دیگر',
  );
  await co.getByRole('button', { name: 'افزودن آدرس' }).click();

  const add = screen(page, 'addaddr');
  await expect(add.getByRole('radiogroup', { name: 'سرویس نقشه' })).toBeVisible();
  await add.getByLabel('آدرس کامل').fill('خیابان امام، کوچه‌ی ۱۲');
  await add.getByLabel('نام گیرنده').fill('امیر');
  await add.getByLabel('موبایل گیرنده').fill('09131234567');
  await add.getByRole('button', { name: 'ذخیره‌ی آدرس' }).click();

  await expect(co.getByRole('region', { name: 'آدرس تحویل' })).toContainText('خیابان امام، کوچه‌ی ۱۲');
  await co.getByRole('radio', { name: /نقدی هنگام تحویل/ }).click();
  await co.getByRole('button', { name: /^ثبت سفارش/ }).click();

  const paid = screen(page, 'paid');
  await expect(paid.getByRole('heading', { name: 'سفارش شما ثبت شد' })).toBeVisible();
  await expect(paid).toContainText('مبلغ قابل پرداخت هنگام تحویل: ۴۶۵٬۰۰۰ تومان');
  await page.goBack();
  await expect(visible(page).getByRole('heading', { name: 'نزدیک شما' })).toBeVisible();
  // cart was emptied
  await page.getByRole('navigation', { name: 'منوی اصلی' }).getByRole('button', { name: /سبد/ }).click();
  await expect(screen(page, 'cart').getByRole('heading', { name: 'سبد خرید شما خالی است' })).toBeVisible();
});

test('checkout layout fits 390 wide without horizontal scroll', async ({ page }) => {
  await seed(page, { loggedIn: true });
  await screen(page, 'cart')
    .getByRole('button', { name: /ادامه و تکمیل سفارش/ })
    .click();
  await expect(screen(page, 'checkout').getByRole('region', { name: 'روش پرداخت' })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
