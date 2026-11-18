import { expect, test, type Page } from '@playwright/test';

const visible = (page: Page) => page.locator('main:not([hidden])');

// Returning device (cookie + launch done) but NOT logged in: a guest.
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
});

async function enterPhoneAndCode(page: Page, phone: string) {
  await expect(visible(page).getByRole('heading', { name: 'ورود یا ثبت‌نام' })).toBeVisible();
  await visible(page).getByLabel('شماره‌ی موبایل').fill(phone);
  await visible(page)
    .getByRole('checkbox', { name: /قوانین و مقررات/ })
    .click();
  await visible(page).getByRole('button', { name: 'دریافت کد تأیید' }).click();
  await expect(visible(page).getByRole('heading', { name: 'کد تأیید' })).toBeVisible();
  await visible(page).getByLabel('کد تأیید').fill('1234');
}

test('guest browses and fills the cart; «ثبت سفارش» asks to log in, then lands on checkout', async ({
  page,
}) => {
  await page.goto('/');
  await expect(visible(page).getByRole('heading', { name: 'سلام مهمان عزیز' })).toBeVisible();
  await visible(page).getByRole('button', { name: 'کباب‌سرای نقش‌جهان', exact: true }).first().click();
  await visible(page).getByRole('button', { name: 'افزودن کباب برگ به سبد' }).click();
  await visible(page)
    .getByRole('button', { name: /مشاهده سبد خرید/ })
    .click();
  await visible(page)
    .getByRole('button', { name: /ثبت سفارش/ })
    .click();

  await enterPhoneAndCode(page, '09131234567'); // known user
  await expect(visible(page).getByRole('heading', { name: 'تکمیل سفارش' })).toBeVisible();
  // The cart was kept, and back goes to the cart — never into login/OTP.
  await page.goBack();
  await expect(visible(page).getByRole('heading', { name: 'سبد خرید' })).toBeVisible();
  await expect(visible(page)).toContainText('کباب برگ');
});

test('new user: OTP → profile → permissions → greeted by name', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'حساب' }).click();
  await visible(page).getByRole('button', { name: 'ورود یا ثبت‌نام' }).click();
  await enterPhoneAndCode(page, '09120000001');
  await expect(visible(page).getByRole('heading', { name: 'تکمیل پروفایل' })).toBeVisible();
  await visible(page).getByLabel('نام و نام خانوادگی').fill('سارا');
  await visible(page).getByRole('button', { name: 'ادامه' }).click();
  await expect(visible(page).getByRole('heading', { name: 'دسترسی‌ها' })).toBeVisible();
  await visible(page).getByRole('button', { name: 'فعلاً نه' }).click();
  await expect(visible(page).getByRole('heading', { name: 'حساب کاربری' })).toBeVisible();
  await expect(visible(page)).toContainText('سلام سارا عزیز');
});

test('wrong OTP shows an error and stays; «ویرایش شماره» returns to the phone', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'حساب' }).click();
  await visible(page).getByRole('button', { name: 'ورود یا ثبت‌نام' }).click();
  await visible(page).getByLabel('شماره‌ی موبایل').fill('09131234567');
  await visible(page)
    .getByRole('checkbox', { name: /قوانین و مقررات/ })
    .click();
  await visible(page).getByRole('button', { name: 'دریافت کد تأیید' }).click();
  await visible(page).getByLabel('کد تأیید').fill('9999');
  await expect(visible(page).getByRole('alert')).toHaveText('کد واردشده درست نیست.');
  await visible(page).getByRole('button', { name: 'ویرایش شماره' }).click();
  await expect(visible(page).getByLabel('شماره‌ی موبایل')).toHaveValue('۰۹۱۳۱۲۳۴۵۶۷');
});

test('guest opening «سفارش‌ها» from the menu is asked to log in; back cancels', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'حساب' }).click();
  await visible(page)
    .getByRole('button', { name: /سفارش‌ها/ })
    .click();
  await expect(visible(page).getByRole('heading', { name: 'ورود یا ثبت‌نام' })).toBeVisible();
  await page.goBack();
  await expect(visible(page).getByRole('heading', { name: 'حساب کاربری' })).toBeVisible();
});
