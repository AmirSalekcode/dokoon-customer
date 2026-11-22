import { expect, test, type Page } from '@playwright/test';
import { dismissCookies, MOCK_CODE, signIn } from './helpers';

// KAN-90 (CP-06): OTP login, wrong code, 429, routing by status, waiting page, cookie card, session on reload.
const visibleScreen = (page: Page) => page.locator('main:not([hidden])');
const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test('first visit: login with the hero and the cookie card; a choice hides it for good', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'ورود به اپ پیک' })).toBeVisible();
  await expect(page.getByText('اپ پیک', { exact: true })).toBeVisible();
  const card = page.getByRole('region', { name: 'کوکی‌ها' });
  await expect(card).toBeVisible();
  for (const name of ['قبول همه', 'فقط ضروری', 'تنظیمات'])
    expect((await card.getByRole('button', { name }).boundingBox())!.height).toBeGreaterThanOrEqual(48);
  await card.getByRole('button', { name: 'تنظیمات' }).click();
  await expect(card.getByRole('switch')).toHaveCount(3);
  await card.getByRole('button', { name: 'ذخیره‌ی انتخاب‌ها' }).click();
  await expect(card).toBeHidden();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'ورود به اپ پیک' })).toBeVisible();
  await expect(card).toBeHidden();
  expect(await overflow(page)).toBeLessThanOrEqual(0);
});

test('approved: phone → code → orders with the greeting; a reload keeps the session', async ({ page }) => {
  await page.goto('/');
  await signIn(page);
  await expect(page.getByRole('heading', { level: 1, name: 'سلام مهدی کریمی عزیز' })).toBeVisible();
  await expect(visibleScreen(page)).toHaveAttribute('data-screen', 'orders');
  await page.reload();
  await expect(visibleScreen(page)).toHaveAttribute('data-screen', 'orders');
  // Back from the first tab never returns to login.
  await page.goBack();
  await expect(page.getByText('برای خروج دوباره بزنید')).toBeVisible();
});

test('a wrong code stays on login with the message; the right one signs in', async ({ page }) => {
  await page.goto('/');
  await dismissCookies(page);
  await page.getByLabel('شماره‌ی موبایل').fill('09131234567');
  await page.getByRole('button', { name: 'دریافت کد تأیید' }).click();
  await page.getByLabel('کد ۴ رقمی').fill('0000');
  await expect(page.getByText('کد واردشده درست نیست')).toBeVisible();
  await expect(page.getByLabel('کد ۴ رقمی')).toHaveValue('');
  await page.getByLabel('کد ۴ رقمی').fill(MOCK_CODE);
  await expect(visibleScreen(page)).toHaveAttribute('data-screen', 'orders');
});

test('429: asking again for a number that just got a code shows the rate-limit text', async ({ page }) => {
  await page.goto('/');
  await dismissCookies(page);
  const phone = page.getByLabel('شماره‌ی موبایل');
  const send = page.getByRole('button', { name: 'دریافت کد تأیید' });
  const edit = page.getByRole('button', { name: 'ویرایش شماره' });
  await phone.fill('09131234567');
  await send.click();
  await expect(page.getByText(/ارسال دوباره‌ی کد تا/)).toBeVisible();
  // Another number, then back to the first: the page asks again, the server still throttles it.
  await edit.click();
  await phone.fill('09131234568');
  await send.click();
  await edit.click();
  await phone.fill('09131234567');
  await send.click();
  await expect(page.getByRole('alert')).toHaveText('چند دقیقه دیگر دوباره تلاش کنید');
  await expect(page.getByLabel('کد ۴ رقمی')).toHaveCount(0);
});

test('pending → waiting page; «خروج از حساب» → login, and a reload stays signed out', async ({ page }) => {
  await page.goto('/');
  await signIn(page, '09120000002');
  await expect(page.getByRole('heading', { name: 'حساب شما در انتظار تأیید است' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'بخش‌های پیک' })).toHaveCount(0);
  await page.getByRole('button', { name: 'بررسی دوباره' }).click();
  await expect(page.getByText('هنوز در حال بررسی است')).toBeVisible();
  await page.getByRole('button', { name: 'خروج از حساب' }).click();
  await expect(page.getByRole('heading', { name: 'ورود به اپ پیک' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'ورود به اپ پیک' })).toBeVisible();
});

test('a new phone opens registration; «پیک جدید هستم» uses the same verification', async ({ page }) => {
  await page.goto('/');
  await dismissCookies(page);
  await page.getByRole('button', { name: 'پیک جدید هستم، ثبت‌نام می‌کنم' }).click();
  await expect(page.getByRole('heading', { name: 'ثبت‌نام پیک جدید' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'ورود به اپ پیک' })).toBeVisible();
  await page.getByRole('button', { name: 'پیک جدید هستم، ثبت‌نام می‌کنم' }).click();
  // The login page below stays mounted (hidden): work inside the visible screen.
  const top = visibleScreen(page);
  await top.getByLabel('شماره‌ی موبایل').fill('09120000001');
  await top.getByRole('button', { name: 'دریافت کد تأیید' }).click();
  await top.getByLabel('کد ۴ رقمی').fill(MOCK_CODE);
  await expect(visibleScreen(page)).toHaveAttribute('data-screen', 'reg');
});

test.describe('dark, tablet', () => {
  test.use({ colorScheme: 'dark', viewport: { width: 1024, height: 768 } });
  test('the login form stays centred and readable in dark at ≥720', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const btn = (await page.getByRole('button', { name: 'دریافت کد تأیید' }).boundingBox())!;
    expect(btn.width).toBeLessThanOrEqual(480);
    expect(btn.height).toBeGreaterThanOrEqual(56);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
});
