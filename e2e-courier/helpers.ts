import { expect, type Page } from '@playwright/test';

/** Mock OTP (src/courier/mocks/data.ts). Any phone not in DEMO_STATUS_PHONES is an approved courier. */
export const MOCK_CODE = '1234';

/** Dismiss the first-visit cookie card if it is there. */
export async function dismissCookies(page: Page, choice: 'فقط ضروری' | 'قبول همه' = 'فقط ضروری') {
  const card = page.getByRole('region', { name: 'کوکی‌ها' });
  if (await card.isVisible()) await card.getByRole('button', { name: choice }).click();
}

/** Sign in through the login page (phone → code); the mock keeps the web session as a cookie. */
export async function signIn(page: Page, phone = '09131234567') {
  await expect(page.getByRole('heading', { name: 'ورود به اپ پیک' })).toBeVisible();
  await dismissCookies(page);
  await page.getByLabel('شماره‌ی موبایل').fill(phone);
  await page.getByRole('button', { name: 'دریافت کد تأیید' }).click();
  await page.getByLabel('کد ۴ رقمی').fill(MOCK_CODE);
}

/** Location + notifications allowed, so an approved courier skips the permissions page (KAN-92). */
export async function allowDevice(page: Page) {
  await page.context().grantPermissions(['geolocation', 'notifications']);
  await page.context().setGeolocation({ latitude: 32.0105, longitude: 51.8664 });
}

/** Open the app at `path` and sign in as an approved courier → the orders tab. */
export async function openCourier(page: Page, path = '/') {
  await allowDevice(page);
  await page.goto(path);
  await signIn(page);
  await expect(page.locator('main:not([hidden])')).toHaveAttribute('data-screen', 'orders');
}
