import { expect, test, type Page } from '@playwright/test';

const visible = (page: Page) => page.locator('main:not([hidden])');

// These flows are not about cookies: start with a saved consent so the popup is not shown.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Returning user: onboarding done, city chosen (launch flow is covered by launch.spec.ts).
    if (!localStorage.getItem('dk-launch'))
      localStorage.setItem('dk-launch', JSON.stringify({ seenOnboarding: true, cityId: 'shahreza' }));
    if (!localStorage.getItem('dk-consent'))
      localStorage.setItem(
        'dk-consent',
        JSON.stringify({ version: 1, analytics: false, decidedAt: '2026-11-18' }),
      );
  });
});

async function openHome(page: Page) {
  await page.goto('/');
  await expect(visible(page).getByRole('heading', { name: 'سلام مهمان عزیز' })).toBeVisible();
  await expect(visible(page).getByRole('heading', { name: 'نزدیک شما' })).toBeVisible();
}

test('RTL, Persian, Yekan Bakh font and Persian digits; no horizontal scroll at 390×844', async ({
  page,
}) => {
  await openHome(page);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
  const font = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(font).toContain('Yekan Bakh');
  // Font file actually loaded (not just declared).
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('700 16px "Yekan Bakh"'))).toBe(true);
  // Persian digits in prices/ETA, no ASCII digits in visible text of the home screen.
  const text = await visible(page).innerText();
  expect(text).toContain('۴۵٬۰۰۰ تومان');
  expect(text).toMatch(/۲۵–۳۵/);
  expect(text).not.toMatch(/[0-9]/);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

// Theme behavior (system default, explicit choice, live switching) lives in theme.spec.ts.

test('back returns to the exact previous screen with its scroll position (UI back and browser/Android back)', async ({
  page,
}) => {
  await openHome(page);
  const home = visible(page);
  const card = home.getByRole('button', { name: 'کباب‌سرای نقش‌جهان', exact: true }).nth(1);
  await home.evaluate((el) => (el.scrollTop = 600));
  await card.hover(); // Playwright scrolls the target into view; measure after that.
  const before = await home.evaluate((el) => el.scrollTop);
  expect(before).toBeGreaterThan(100);
  await card.click();
  await expect(visible(page).getByRole('heading', { name: 'کباب‌سرای نقش‌جهان', level: 1 })).toBeVisible();
  // In-app back button
  await visible(page).getByRole('button', { name: 'بازگشت' }).click();
  await expect(visible(page).getByRole('heading', { name: 'سلام مهمان عزیز' })).toBeAttached();
  expect(await visible(page).evaluate((el) => el.scrollTop)).toBe(before);

  // System back (browser back = popstate, same handler as Android back)
  const card2 = visible(page).getByRole('button', { name: 'برگر لاین', exact: true }).nth(1);
  await card2.hover();
  const before2 = await visible(page).evaluate((el) => el.scrollTop);
  await card2.click();
  await expect(visible(page).getByRole('heading', { name: 'برگر لاین', level: 1 })).toBeVisible();
  await page.goBack();
  await expect(visible(page).getByRole('heading', { name: 'سلام مهمان عزیز' })).toBeAttached();
  expect(await visible(page).evaluate((el) => el.scrollTop)).toBe(before2);
});

test('system back closes an overlay first; at home root first back warns to exit', async ({ page }) => {
  await openHome(page);
  await page.getByRole('button', { name: 'منو' }).click();
  await expect(page.getByRole('dialog', { name: 'منو' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'منو' }).getByText('سلام مهمان عزیز')).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goBack();
  await expect(page.getByText('برای خروج دوباره بزنید')).toBeVisible();
});

test('only one overlay at a time; scrim tap closes it', async ({ page }) => {
  await openHome(page);
  await page.getByRole('button', { name: /آدرس تحویل/ }).click();
  await expect(page.getByRole('dialog', { name: 'انتخاب آدرس تحویل' })).toBeVisible();
  await page.getByTestId('scrim').click({ position: { x: 20, y: 20 } });
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('single cart: adding from another restaurant asks to clear; cancel keeps, confirm replaces', async ({
  page,
}) => {
  await openHome(page);
  await visible(page).getByRole('button', { name: 'کباب‌سرای نقش‌جهان' }).first().click();
  await visible(page).getByRole('button', { name: 'افزودن کباب برگ به سبد' }).click();
  await expect(page.getByText('به سبد خرید اضافه شد')).toBeVisible();
  await expect(visible(page).getByRole('button', { name: /مشاهده سبد خرید/ })).toContainText('۴۲۰٬۰۰۰');
  await visible(page).getByRole('button', { name: 'بازگشت' }).click();

  await visible(page).getByRole('button', { name: 'برگر لاین' }).first().click();
  await visible(page).getByRole('button', { name: 'افزودن پیتزا پپرونی به سبد' }).click();
  const dlg = page.getByRole('alertdialog', { name: 'سبد خرید قبلی خالی شود؟' });
  await expect(dlg).toContainText('کباب‌سرای نقش‌جهان');
  await dlg.getByRole('button', { name: 'انصراف' }).click();
  await expect(dlg).toHaveCount(0);

  await visible(page).getByRole('button', { name: 'افزودن پیتزا پپرونی به سبد' }).click();
  await page.getByRole('button', { name: 'خالی کردن سبد و ادامه' }).click();
  await visible(page)
    .getByRole('button', { name: /مشاهده سبد خرید/ })
    .click();
  const cart = visible(page);
  await expect(cart.getByRole('heading', { name: 'سبد خرید' })).toBeVisible();
  await expect(cart).toContainText('پیتزا پپرونی');
  await expect(cart).not.toContainText('کباب برگ');
  await expect(page.getByRole('button', { name: /سبد خرید، ۱ قلم/ })).toBeVisible();
});

test('food sheet: required option gates add; live price', async ({ page }) => {
  await openHome(page);
  await visible(page).getByRole('button', { name: 'برگر لاین' }).first().click();
  await visible(page).getByRole('button', { name: 'افزودن چیزبرگر دوبل به سبد' }).click();
  const sheet = page.getByRole('dialog', { name: 'جزئیات چیزبرگر دوبل' });
  await expect(sheet.getByRole('button', { name: 'گزینه‌ی الزامی را انتخاب کنید' })).toBeDisabled();
  await sheet.getByRole('radio', { name: /متوسط/ }).click();
  await expect(sheet.getByRole('button', { name: /افزودن به سبد/ })).toContainText('۲۸۰٬۰۰۰');
  await sheet.getByRole('button', { name: 'افزودن یک عدد چیزبرگر دوبل' }).click();
  await expect(sheet.getByRole('button', { name: /افزودن به سبد/ })).toContainText('۵۶۰٬۰۰۰');
  await sheet.getByRole('button', { name: /افزودن به سبد/ }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(visible(page)).toContainText('۲ عدد در سبد');
});

test('offline → offline ErrorPage; reconnect returns automatically', async ({ page, context }) => {
  await openHome(page);
  await context.setOffline(true);
  await expect(page.getByRole('heading', { name: 'اینترنت متصل نیست' })).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByRole('heading', { name: 'اینترنت متصل نیست' })).toHaveCount(0);
  await expect(visible(page).getByRole('heading', { name: 'سلام مهمان عزیز' })).toBeVisible();
});

test('server 503 (after retries) → e503 ErrorPage; retry goes back and reloads', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('dk-mock-status', '503'));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'سرویس موقتاً در دسترس نیست' })).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByText('۵۰۳')).toBeVisible();
  await page.evaluate(() => localStorage.removeItem('dk-mock-status'));
  await page.getByRole('button', { name: 'تلاش دوباره' }).click();
  await expect(visible(page).getByRole('heading', { name: 'نزدیک شما' })).toBeVisible();
});

test('app config maintenance → maintenance page at startup; back cannot skip it', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('dk-mock-config', '{"maintenance":true}'));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'دکون در حال به‌روزرسانی است' })).toBeVisible({
    timeout: 10_000,
  });
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'دکون در حال به‌روزرسانی است' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'نزدیک شما' })).toHaveCount(0);
});

test('app older than config minVersion → forced update page; back cannot skip it', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('dk-mock-config', '{"minVersion":"99.0.0"}'));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'نسخه‌ی جدید دکون آماده است' })).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByRole('button', { name: 'به‌روزرسانی' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'نسخه‌ی جدید دکون آماده است' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'نزدیک شما' })).toHaveCount(0);
});

test('every ErrorPage kind renders from the dev preview', async ({ page }) => {
  await openHome(page);
  await page.getByRole('button', { name: 'حساب' }).click();
  await visible(page)
    .getByRole('button', { name: /تنظیمات/ })
    .click();
  const expected: Record<string, string> = {
    e401: 'نشست شما منقضی شده',
    e403: 'اجازه‌ی دسترسی ندارید',
    e404: 'صفحه پیدا نشد',
    e500: 'مشکلی در سرور پیش آمده',
    e504: 'پاسخ از سرور دیر رسید',
  };
  for (const [kind, title] of Object.entries(expected)) {
    // Chip labels use Persian digits (e401 → e۴۰۱).
    const label = kind.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
    await visible(page).getByRole('button', { name: label, exact: true }).click();
    await expect(visible(page).getByRole('heading', { name: title })).toBeVisible();
    await page.goBack();
    await expect(visible(page).getByRole('heading', { name: 'تنظیمات' })).toBeVisible();
  }
});

test('touch targets of icon buttons are at least 48px', async ({ page }) => {
  await openHome(page);
  const sizes = await page.evaluate(() =>
    Array.from(document.querySelectorAll('main:not([hidden]) button[aria-label], nav button')).map((b) => {
      const r = b.getBoundingClientRect();
      return { name: b.getAttribute('aria-label') ?? b.textContent, w: r.width, h: r.height };
    }),
  );
  const small = sizes.filter((x) => x.w > 0 && (x.w < 48 || x.h < 48));
  expect(small).toEqual([]);
});
