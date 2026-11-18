import { expect, test, type Page } from '@playwright/test';

const screen = (page: Page, id: string) => page.locator(`main[data-screen="${id}"]:not([hidden])`);

async function openHome(page: Page, { loggedIn = false } = {}) {
  await page.addInitScript((li) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    const set = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));
    set('dk-consent', { version: 1, analytics: false, decidedAt: '2026-11-18' });
    set('dk-launch', { seenOnboarding: true, cityId: 'shahreza' });
    if (li) set('dk-session', { accessToken: 'a', refreshToken: 'r', user: null });
  }, loggedIn);
  await page.goto('/');
  await expect(screen(page, 'home').locator('section').first()).toBeVisible();
}

async function openFromMenu(page: Page, label: string, id: string) {
  await screen(page, 'home').getByRole('button', { name: 'منو' }).click();
  await page.getByRole('button', { name: label }).click();
  await expect(screen(page, id)).toBeVisible();
  return screen(page, id);
}

test('support: contacts, FAQ, message; back returns home', async ({ page }) => {
  await openHome(page, { loggedIn: true });
  const sp = await openFromMenu(page, 'پشتیبانی و پرسش‌های متداول', 'support');
  await expect(sp.getByRole('link', { name: 'تماس با تماس تلفنی با پشتیبانی' })).toHaveAttribute(
    'href',
    'tel:+983100000000',
  );
  const q = sp.getByRole('button', { name: 'پرداخت چگونه انجام می‌شود؟' });
  await q.click();
  await expect(q).toHaveAttribute('aria-expanded', 'true');
  await sp.getByLabel('پیام شما').fill('سلام');
  await sp.getByRole('button', { name: 'ارسال پیام' }).click();
  await expect(page.getByText('پیام شما ارسال شد')).toBeVisible();
  await expect(sp.getByLabel('پیام شما')).toHaveValue('');
  await page.goBack();
  await expect(screen(page, 'home')).toBeVisible();
});

test('support offline → offline ErrorPage; reconnect returns to support', async ({ page, context }) => {
  await openHome(page);
  await openFromMenu(page, 'پشتیبانی و پرسش‌های متداول', 'support');
  await context.setOffline(true);
  await expect(page.getByRole('heading', { name: 'اینترنت متصل نیست' })).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByRole('heading', { name: 'اینترنت متصل نیست' })).toHaveCount(0);
  await expect(
    screen(page, 'support').getByRole('button', { name: 'چطور سفارش را پیگیری کنم؟' }),
  ).toBeVisible();
});

test('social server 500 → e500 ErrorPage; retry reloads the list', async ({ page }) => {
  await openHome(page);
  await page.evaluate(() => localStorage.setItem('dk-mock-status', '500'));
  await screen(page, 'home').getByRole('button', { name: 'منو' }).click();
  await page.getByRole('button', { name: 'شبکه‌های اجتماعی' }).click();
  await expect(page.getByRole('heading', { name: 'مشکلی در سرور پیش آمده' })).toBeVisible({
    timeout: 10_000,
  });
  await page.evaluate(() => localStorage.removeItem('dk-mock-status'));
  await page.getByRole('button', { name: 'تلاش دوباره' }).click();
  await expect(screen(page, 'social').getByRole('button', { name: 'دنبال کردن اینستاگرام' })).toBeVisible();
});

test('invite: guest is sent to login', async ({ page }) => {
  await openHome(page);
  const inv = await openFromMenu(page, 'دعوت از دوستان', 'invite');
  await inv.getByRole('button', { name: 'ورود یا ثبت‌نام' }).click();
  await expect(screen(page, 'login')).toBeVisible();
});

test('invite: code and actions for a logged-in user', async ({ page }) => {
  await openHome(page, { loggedIn: true });
  const inv = await openFromMenu(page, 'دعوت از دوستان', 'invite');
  await expect(inv.getByText('DOKOON-AMIR')).toBeVisible();
  await expect(inv.getByRole('button', { name: 'کپی کد دعوت' })).toBeVisible();
  await expect(inv.getByRole('button', { name: 'ارسال برای دوستان' })).toBeVisible();
});

test('rateapp: stars required, thanks after sending, back returns home', async ({ page }) => {
  await openHome(page, { loggedIn: true });
  const ra = await openFromMenu(page, 'امتیاز دادن به دکون', 'rateapp');
  const send = ra.getByRole('button', { name: 'ثبت امتیاز' });
  await expect(send).toBeDisabled();
  await ra.getByRole('radio', { name: '۴ ستاره' }).click();
  await send.click();
  await expect(ra.getByRole('heading', { name: 'ممنون از امتیاز شما' })).toBeVisible();
  await ra.getByRole('button', { name: 'بازگشت', exact: true }).last().click();
  await expect(screen(page, 'home')).toBeVisible();
});

test('no horizontal scroll on the four screens at 390 wide', async ({ page }) => {
  await openHome(page, { loggedIn: true });
  for (const [label, id] of [
    ['پشتیبانی و پرسش‌های متداول', 'support'],
    ['دعوت از دوستان', 'invite'],
    ['شبکه‌های اجتماعی', 'social'],
    ['امتیاز دادن به دکون', 'rateapp'],
  ] as const) {
    await openFromMenu(page, label, id);
    await expect(screen(page, id).locator('h2').first()).toBeVisible();
    expect(await page.evaluate(() => document.scrollingElement!.scrollWidth)).toBeLessThanOrEqual(390);
    await page.goBack();
    await expect(screen(page, 'home')).toBeVisible();
  }
});

test('apply (restaurant): validation, Persian digits, success message, back returns home', async ({
  page,
}) => {
  await openHome(page);
  const ap = await openFromMenu(page, 'ثبت‌نام رستوران', 'apply');
  await expect(ap.getByRole('heading', { level: 1, name: 'ثبت‌نام رستوران' })).toBeVisible();
  const send = ap.getByRole('button', { name: 'ثبت درخواست' });
  await ap.getByLabel('نام رستوران').fill('کافه نارنج');
  await ap.getByLabel('نام مالک').fill('سارا احمدی');
  await ap.getByLabel('آدرس رستوران').fill('شهرضا، خیابان امام');
  await ap.getByLabel('شماره‌ی تماس').fill('۰۸۱۲۱۲۳۴۵۶۷');
  await expect(ap.getByText('شماره نامعتبر است')).toBeVisible();
  await expect(send).toBeDisabled();
  await ap.getByLabel('شماره‌ی تماس').fill('۰۹۱۲۱۲۳۴۵۶۷');
  await expect(ap.getByLabel('شهر')).toHaveValue('shahreza');
  expect(await page.evaluate(() => document.scrollingElement!.scrollWidth)).toBeLessThanOrEqual(390);
  await send.click();
  await expect(ap.getByRole('heading', { name: 'درخواست شما ثبت شد' })).toBeVisible();
  await ap.getByRole('button', { name: 'بازگشت' }).click();
  await expect(screen(page, 'home')).toBeVisible();
});

test('apply (courier): own fields; system back returns home', async ({ page }) => {
  await openHome(page);
  const ap = await openFromMenu(page, 'همکاری با پیک', 'apply');
  await expect(ap.getByRole('heading', { level: 1, name: 'همکاری با پیک' })).toBeVisible();
  await ap.getByLabel('نوع وسیله‌ی نقلیه').selectOption('موتورسیکلت');
  await expect(ap.getByLabel('محدوده‌ی فعالیت')).toBeVisible();
  await page.goBack();
  await expect(screen(page, 'home')).toBeVisible();
});

test('report: photo uploaded (POST /uploads), too-large rejected, report sent → back to track', async ({
  page,
}) => {
  await openHome(page, { loggedIn: true });
  await page.getByRole('navigation', { name: 'منوی اصلی' }).getByRole('button', { name: 'حساب' }).click();
  await screen(page, 'account')
    .getByRole('button', { name: /^سفارش‌ها/ })
    .click();
  await screen(page, 'orders')
    .getByRole('button', { name: /سفارش ۱۰۲۵۴/ })
    .click();
  await screen(page, 'track').getByRole('button', { name: 'گزارش مشکل' }).click();
  const rp = screen(page, 'report');
  await rp.getByRole('radio', { name: 'غذا کامل نبود' }).click();
  await rp.getByLabel('توضیح مشکل').fill('نوشابه نبود');
  const input = rp.getByLabel('افزودن عکس (اختیاری)');
  await input.setInputFiles({
    name: 'big.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.alloc(6 * 1024 * 1024),
  });
  await expect(rp.getByRole('alert')).toHaveText('حجم عکس باید کمتر از ۵ مگابایت باشد');
  // 1×1 PNG
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
  const uploaded = page.waitForResponse(
    (r) => r.url().endsWith('/uploads') && r.request().method() === 'POST',
  );
  await input.setInputFiles({ name: 'food.png', mimeType: 'image/png', buffer: png });
  const up = await uploaded;
  expect(up.status()).toBe(201);
  expect(((await up.json()) as { id: string }).id).toMatch(/^up\d+$/);
  await expect(rp.getByRole('list', { name: 'عکس‌ها' }).getByRole('listitem')).toHaveCount(1);
  await expect(rp.getByRole('img', { name: 'عکس ۱' })).toBeVisible();
  expect(await page.evaluate(() => document.scrollingElement!.scrollWidth)).toBeLessThanOrEqual(390);
  // (the report body with photoUploadIds is asserted in more.test.tsx; the SW hides fetch bodies here)
  await rp.getByRole('button', { name: 'ثبت گزارش' }).click();
  await expect(screen(page, 'track')).toBeVisible();
  await expect(page.getByText('گزارش شما ثبت شد')).toBeVisible();
});
