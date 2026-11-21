import { expect, test, type Page } from '@playwright/test';
import { openPanel, seedSession } from './helpers';

// KAN-69: account tab — weekly hours and delivery & payment settings are saved (390 and 1024 wide).
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

test('weekly hours: open Friday until 01:30 and see it after re-opening', async ({ page }) => {
  await openAccount(page);
  await visible(page)
    .getByRole('button', { name: /ساعت کاری/ })
    .click();
  const v = visible(page);
  await v.getByRole('switch', { name: 'باز بودن در جمعه' }).click();
  await v.getByRole('combobox', { name: 'ساعت پایان جمعه' }).selectOption('01:30');
  await v.getByRole('button', { name: 'ذخیره‌ی ساعت کاری' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'ساعت کاری ذخیره شد' })).toBeVisible();
  await expect(visible(page)).toHaveAttribute('data-screen', 'account');

  await visible(page)
    .getByRole('button', { name: /ساعت کاری/ })
    .click();
  await expect(visible(page).getByRole('switch', { name: 'باز بودن در جمعه' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(visible(page).getByRole('combobox', { name: 'ساعت پایان جمعه' })).toHaveValue('01:30');
});

test('delivery settings: cash off, prep range, saved; extras off hides option groups in the dish editor', async ({
  page,
}) => {
  await openAccount(page);
  await visible(page)
    .getByRole('button', { name: /تنظیمات تحویل و پرداخت/ })
    .click();
  const v = visible(page);
  await v.getByRole('switch', { name: 'پرداخت نقدی هنگام تحویل' }).click();
  await v.getByRole('switch', { name: 'افزودنی و گزینه‌ها' }).click();
  await v.getByRole('button', { name: 'کاهش حداقل زمان' }).click();
  await v.getByRole('button', { name: 'ذخیره‌ی تنظیمات' }).click();
  await expect(visible(page)).toHaveAttribute('data-screen', 'account');

  await visible(page)
    .getByRole('button', { name: /تنظیمات تحویل و پرداخت/ })
    .click();
  await expect(visible(page).getByRole('switch', { name: 'پرداخت نقدی هنگام تحویل' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await expect(visible(page).getByText('۲۵ دقیقه')).toBeVisible();

  await visible(page).getByRole('button', { name: 'بازگشت' }).click();
  await nav(page).getByRole('button', { name: 'منو' }).click();
  await visible(page).getByRole('button', { name: 'ویرایش چلوکباب کوبیده' }).click();
  await expect(visible(page).getByText(/افزودنی‌ها برای کل رستوران خاموش است/)).toBeVisible();
});

test.describe('tablet 1024', () => {
  test.use({ viewport: { width: 1024, height: 768 } });
  test('hours sit in two columns without horizontal scroll', async ({ page }) => {
    await openAccount(page);
    await visible(page)
      .getByRole('button', { name: /ساعت کاری/ })
      .click();
    const a = await visible(page).getByRole('switch', { name: 'باز بودن در شنبه' }).boundingBox();
    const b = await visible(page).getByRole('switch', { name: 'باز بودن در یکشنبه' }).boundingBox();
    expect(a && b && Math.abs(a.y - b.y) < 2).toBe(true);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBeLessThanOrEqual(0);
  });
});
