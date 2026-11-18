import { expect, test, type Page } from '@playwright/test';

const screen = (page: Page, id: string) => page.locator(`main[data-screen="${id}"]:not([hidden])`);

/** Logged-in user, one food in the cart, one saved address (mock db), optional fast order steps. */
async function seed(page: Page, stepMs = 0) {
  await page.addInitScript(
    ({ stepMs }) => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      const set = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));
      set('dk-consent', { version: 1, analytics: false, decidedAt: '2026-11-18' });
      set('dk-launch', { seenOnboarding: true, cityId: 'shahreza' });
      set('dk-session', { accessToken: 'a', refreshToken: 'r', user: null });
      set('dk-cart', {
        restaurant: { id: 'naghsh', name: 'کباب‌سرای نقش‌جهان' },
        lines: [{ lineId: 'n2', foodId: 'n2', title: 'کباب برگ', unitPrice: 420000, qty: 1, options: [] }],
        note: '',
        promoCode: '',
      });
      set('dk-mock-db', {
        addresses: [
          {
            id: 'a1',
            title: 'خانه',
            fullText: 'شهرضا، خیابان امام، کوچه‌ی ۱۲',
            location: { lat: 32.0089, lng: 51.8668 },
            recipientName: 'امیر',
            recipientPhone: '09131234567',
            inZone: true,
          },
        ],
        orders: [],
        seq: 1,
      });
      if (stepMs) set('dk-mock-step-ms', stepMs);
    },
    { stepMs },
  );
  await page.goto('/');
  await page.getByRole('navigation', { name: 'منوی اصلی' }).getByRole('button', { name: /سبد/ }).click();
  await screen(page, 'cart')
    .getByRole('button', { name: /ادامه و تکمیل سفارش/ })
    .click();
  await expect(screen(page, 'checkout').getByRole('region', { name: 'آدرس تحویل' })).toContainText('خانه');
}

test('online payment fails → payfail → choose cash → paid → track → cancel', async ({ page }) => {
  await seed(page);
  const co = screen(page, 'checkout');
  await co.getByRole('button', { name: /^ثبت سفارش و پرداخت/ }).click();

  const gw = screen(page, 'gateway');
  await expect(gw).toContainText('۴۶۵٬۰۰۰ تومان');
  await gw.getByRole('button', { name: 'پرداخت ناموفق' }).click();

  const fail = screen(page, 'payfail');
  await expect(fail.getByRole('heading', { name: 'پرداخت ناموفق بود' })).toBeVisible();
  await fail.getByRole('button', { name: 'انتخاب پرداخت نقدی' }).click();

  await expect(co.getByRole('radio', { name: /نقدی هنگام تحویل/ })).toHaveAttribute('aria-checked', 'true');
  await co.getByRole('button', { name: /^ثبت سفارش/ }).click();
  await screen(page, 'paid').getByRole('button', { name: 'پیگیری سفارش' }).click();

  const track = screen(page, 'track');
  await expect(track.getByRole('status')).toHaveText('سفارش ثبت شد');
  await expect(track.getByText('زمان تقریبی تحویل: ۲۵ تا ۳۵ دقیقه')).toBeVisible();
  await track.getByRole('button', { name: 'لغو سفارش' }).click();

  const cancel = screen(page, 'cancel');
  await cancel.getByRole('radio', { name: 'اشتباه سفارش دادم' }).click();
  await cancel.getByRole('button', { name: 'تأیید لغو سفارش' }).click();
  await expect(track.getByRole('status')).toHaveText('سفارش لغو شد');
  await expect(track.getByRole('button', { name: 'لغو سفارش' })).toHaveCount(0);
});

test('online payment succeeds → paid «پرداخت موفق»; system back on the gateway = cancel', async ({
  page,
}) => {
  await seed(page);
  await screen(page, 'checkout')
    .getByRole('button', { name: /^ثبت سفارش و پرداخت/ })
    .click();
  await expect(screen(page, 'gateway')).toContainText('درگاه آزمایشی');
  await page.goBack();
  await expect(screen(page, 'payfail')).toBeVisible();
  await screen(page, 'payfail').getByRole('button', { name: 'تلاش دوباره' }).click();
  await screen(page, 'gateway').getByRole('button', { name: 'پرداخت موفق' }).click();
  await expect(screen(page, 'paid')).toContainText('پرداخت موفق');
  await page.goBack();
  await expect(screen(page, 'home')).toBeVisible();
});

test('delivered order can be rated once', async ({ page }) => {
  await seed(page, 1);
  const co = screen(page, 'checkout');
  await co.getByRole('radio', { name: /نقدی هنگام تحویل/ }).click();
  await co.getByRole('button', { name: /^ثبت سفارش/ }).click();
  await screen(page, 'paid').getByRole('button', { name: 'پیگیری سفارش' }).click();
  const track = screen(page, 'track');
  await expect(track.getByRole('status')).toHaveText('تحویل شد');
  await expect(track.getByRole('link', { name: 'تماس با پیک: رضا محمدی' })).toBeVisible();
  await track.getByRole('button', { name: 'امتیاز به سفارش' }).click();
  const rate = screen(page, 'rateorder');
  await rate
    .getByRole('radiogroup', { name: 'امتیاز به رستوران' })
    .getByRole('radio', { name: '۵ ستاره' })
    .click();
  await rate.getByRole('button', { name: 'ثبت امتیاز' }).click();
  await expect(track.getByRole('button', { name: 'امتیاز به سفارش' })).toHaveCount(0);
});
