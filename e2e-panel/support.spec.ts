import { expect, test, type Page } from '@playwright/test';
import { openPanel, seedSession } from './helpers';

// KAN-70: support message, Sheba change request, notifications, restaurant info.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('dk-mock-neworder-ms', '0'));
  await seedSession(page);
});

const visible = (page: Page) => page.locator('main:not([hidden])');
const nav = (page: Page) => page.getByRole('navigation', { name: 'بخش‌های رستوران' });

async function openAccount(page: Page) {
  await openPanel(page);
  await nav(page).getByRole('button', { name: 'حساب' }).click();
  await expect(visible(page).getByRole('heading', { level: 2, name: 'کبابی سنتی زاگرس' })).toBeVisible();
}

test('send a support message from help', async ({ page }) => {
  await openAccount(page);
  await visible(page)
    .getByRole('button', { name: /راهنما و پشتیبانی/ })
    .click();
  await visible(page).getByRole('button', { name: 'ارسال پیام به پشتیبانی' }).click();
  const v = visible(page);
  await v.getByRole('button', { name: 'مشکل فنی' }).click();
  await v.getByLabel('توضیح مشکل یا درخواست').fill('صدای زنگ روی تبلت پخش نمی‌شود');
  await v.getByRole('button', { name: 'ارسال پیام' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'پیام شما فرستاده شد' })).toBeVisible();
  await expect(visible(page)).toHaveAttribute('data-screen', 'help');
});

test('request a Sheba change with a fresh SMS code', async ({ page }) => {
  await openAccount(page);
  await visible(page)
    .getByRole('button', { name: /اطلاعات رستوران/ })
    .click();
  await visible(page).getByRole('button', { name: 'درخواست تغییر شبا' }).click();
  const v = visible(page);
  await v.getByLabel('شماره‌ی شبای تازه').fill('IR062960000000100324200001');
  await v.getByLabel('شماره‌ی موبایل مدیر').fill('09131234567');
  await v.getByRole('button', { name: 'ارسال کد تأیید' }).click();
  await v.getByLabel('کد تأیید پیامکی').fill('1234');
  await v.getByRole('button', { name: 'ثبت درخواست تغییر شبا' }).click();
  await expect(visible(page)).toHaveAttribute('data-screen', 'info');
  await expect(visible(page).getByRole('button', { name: 'تغییر شبا در حال بررسی است' })).toBeDisabled();
  await expect(visible(page).getByText(/در حال بررسی دکون است/)).toBeVisible();
});

test('notifications: read all; Android back returns to the account', async ({ page }) => {
  await openAccount(page);
  await visible(page)
    .getByRole('button', { name: /اعلان‌ها.*۲ پیام خوانده‌نشده/ })
    .click();
  await visible(page).getByRole('button', { name: 'خواندن همه' }).click();
  await expect(visible(page).getByRole('button', { name: 'خواندن همه' })).toHaveCount(0);
  await page.goBack();
  await expect(visible(page)).toHaveAttribute('data-screen', 'account');
  await expect(visible(page).getByRole('button', { name: /اعلان‌ها/ })).toContainText(
    'پیام‌های دکون برای رستوران',
  );
});
