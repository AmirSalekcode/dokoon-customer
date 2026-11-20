import { expect, test, type Page } from '@playwright/test';
import { SHIFT_BUTTON } from './helpers';

// KAN-59: mobile + SMS code login, routing by registration status, logout.
const visible = (page: Page) => page.locator('main:not([hidden])');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('dk-mock-neworder-ms', '0'));
});

async function signIn(page: Page, phone: string) {
  await page.goto('/');
  await page.getByLabel('شماره‌ی موبایل مدیر رستوران').fill(phone);
  await page.getByRole('button', { name: 'دریافت کد تأیید' }).click();
  const code = page.getByLabel('کد ۴ رقمی');
  await expect(code).toHaveAttribute('autocomplete', 'one-time-code');
  await code.fill('۱۲۳۴');
}

test('login → shift → orders; reload asks for the shift again; logout returns to login', async ({ page }) => {
  await signIn(page, '۰۹۱۳ ۱۲۳ ۴۵۶۷');
  await page.getByRole('button', { name: SHIFT_BUTTON }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'کبابی سنتی زاگرس' })).toBeVisible();
  await expect(visible(page)).toHaveAttribute('data-screen', 'orders');

  // Browser back at the root never returns to login.
  await page.goBack();
  await expect(visible(page)).toHaveAttribute('data-screen', 'orders');

  await page.reload();
  await expect(page.getByRole('button', { name: SHIFT_BUTTON })).toBeVisible();
  await page.getByRole('button', { name: SHIFT_BUTTON }).click();

  await page
    .getByRole('navigation', { name: 'بخش‌های رستوران' })
    .getByRole('button', { name: 'حساب' })
    .click();
  await visible(page)
    .getByRole('button', { name: /خروج از حساب/ })
    .click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'خروج' }).click();
  await expect(page.getByRole('heading', { name: 'ورود به پنل رستوران' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'ورود به پنل رستوران' })).toBeVisible();
});

test('a wrong number is refused; «ویرایش شماره» returns to the number', async ({ page }) => {
  await page.goto('/');
  const phone = page.getByLabel('شماره‌ی موبایل مدیر رستوران');
  await phone.fill('08123456789');
  await expect(page.getByText('شماره‌ی موبایل درست نیست')).toBeVisible();
  await expect(page.getByRole('button', { name: 'دریافت کد تأیید' })).toBeDisabled();
  await phone.fill('09131234567');
  await page.getByRole('button', { name: 'دریافت کد تأیید' }).click();
  await page.getByLabel('کد ۴ رقمی').fill('9999');
  await expect(page.getByText('کد واردشده درست نیست')).toBeVisible();
  await page.getByRole('button', { name: 'ویرایش شماره' }).click();
  await expect(page.getByLabel('شماره‌ی موبایل مدیر رستوران')).toBeVisible();
});

test('pending restaurant → status page without navigation', async ({ page }) => {
  await signIn(page, '09130000001');
  await expect(page.getByRole('heading', { level: 2, name: 'درخواست شما در حال بررسی است' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'بخش‌های رستوران' })).toHaveCount(0);
});

test('rejected restaurant → reason and «ثبت‌نام دوباره»', async ({ page }) => {
  await signIn(page, '09130000003');
  await expect(page.getByRole('note')).toContainText('مجوز کسب');
  await expect(page.getByRole('button', { name: 'ثبت‌نام دوباره' })).toBeVisible();
});

for (const [label, size] of [
  ['phone 390', { width: 390, height: 844 }],
  ['tablet 1024', { width: 1024, height: 768 }],
] as const) {
  test(`login fits ${label}: no horizontal scroll, touch targets ≥ 48px`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'ورود به پنل رستوران' })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('button, input')]
        .filter((el) => el.offsetParent !== null)
        .map((el) => ({
          t: el.textContent?.trim() || el.getAttribute('aria-label'),
          r: el.getBoundingClientRect(),
        }))
        .filter(({ r }) => r.height < 48)
        .map(({ t, r }) => `${t} ${Math.round(r.height)}`),
    );
    expect(small).toEqual([]);
  });
}

test.describe('dark', () => {
  test.use({ colorScheme: 'dark' });
  test('login renders in the dark theme', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'ورود به پنل رستوران' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});
