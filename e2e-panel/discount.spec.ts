import { expect, test, type Page } from '@playwright/test';
import { openPanel, seedSession } from './helpers';

// KAN-109 (D-131): «تخفیف ویژه» in the dish editor and on the menu list (390×844 and ≥720).
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('dk-mock-neworder-ms', '0'));
  await seedSession(page);
});

const visible = (page: Page) => page.locator('main:not([hidden])');
const nav = (page: Page) => page.getByRole('navigation', { name: 'بخش‌های رستوران' });

async function editDish(page: Page, name: string) {
  await openPanel(page);
  await nav(page).getByRole('button', { name: 'منو' }).click();
  await visible(page)
    .getByRole('button', { name: `ویرایش ${name}` })
    .click();
  await expect(visible(page).getByRole('heading', { name: 'ویرایش غذا' })).toBeVisible();
}

test('10% chip, save, badge on the menu, then «پایان تخفیف»', async ({ page }) => {
  await editDish(page, 'جوجه‌کباب با استخوان');
  const v = visible(page);
  await v.getByRole('switch', { name: 'تخفیف روی این غذا' }).click();
  await v.getByRole('button', { name: '۱۰٪', exact: true }).click();
  await expect(v.getByText('۲۳۸٬۰۰۰ تومان')).toBeVisible();
  await expect(v.getByText('۱۰٪ تخفیف')).toBeVisible();
  await v.getByRole('button', { name: '۷ روز' }).click();
  await v.getByRole('button', { name: 'ذخیره‌ی غذا' }).click();

  const menu = visible(page);
  await expect(menu).toHaveAttribute('data-screen', 'menu');
  const row = menu.getByRole('listitem').filter({ hasText: 'جوجه‌کباب با استخوان' });
  await expect(row.getByText('۱۰٪ تخفیف')).toBeVisible();
  await expect(row.getByText('تا ۷ روز دیگر')).toBeVisible();
  await expect(row.getByText('۲۳۸٬۰۰۰ تومان')).toBeVisible();
  await expect(row.getByLabel('قیمت قبلی ۲۶۵٬۰۰۰')).toBeVisible();

  await row.getByRole('button', { name: 'پایان تخفیف جوجه‌کباب با استخوان' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'تخفیف «جوجه‌کباب با استخوان» تمام شد' }),
  ).toBeVisible();
  await expect(row.getByText('۱۰٪ تخفیف')).toHaveCount(0);
  await expect(row.getByText('۲۶۵٬۰۰۰ تومان')).toBeVisible();
});

test('60% asks for confirmation; a discounted price above the price is an error', async ({ page }) => {
  await editDish(page, 'جوجه‌کباب با استخوان');
  const v = visible(page);
  await v.getByRole('switch', { name: 'تخفیف روی این غذا' }).click();
  const field = v.getByLabel('قیمت با تخفیف');
  await field.fill('300000');
  await expect(v.getByText('قیمت با تخفیف باید کمتر از قیمت اصلی باشد')).toBeVisible();
  await v.getByRole('button', { name: 'ذخیره‌ی غذا' }).click();
  await expect(visible(page)).toHaveAttribute('data-screen', 'dish');

  await field.fill('106000'); // 60%
  await v.getByRole('button', { name: 'ذخیره‌ی غذا' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog.getByText('تخفیف بیش از ۵۰٪ است؛ مطمئنید؟')).toBeVisible();
  await expect(dialog.getByText(/۶۰٪ تخفیف/)).toBeVisible();
  await dialog.getByRole('button', { name: 'بله، ذخیره کن' }).click();
  await expect(visible(page)).toHaveAttribute('data-screen', 'menu');
  await expect(
    visible(page).getByRole('listitem').filter({ hasText: 'جوجه‌کباب با استخوان' }).getByText('۶۰٪ تخفیف'),
  ).toBeVisible();
});

test('festival with a Jalali end date; dark theme; tablet layout keeps the row', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('dk-theme', 'dark'));
  await page.setViewportSize({ width: 1024, height: 768 });
  await editDish(page, 'قورمه‌سبزی');
  const v = visible(page);
  await v.getByRole('switch', { name: 'تخفیف روی این غذا' }).click();
  await v.getByRole('button', { name: '۲۰٪', exact: true }).click();
  await v.getByRole('button', { name: 'جشنواره', exact: true }).click();
  await v.getByRole('button', { name: 'تاریخ دلخواه' }).click();
  const cal = v.getByRole('group', { name: 'روز پایان تخفیف' });
  await cal.getByRole('button', { name: 'ماه بعد' }).click();
  await cal.getByRole('button', { name: /^\S+ ۱۰ / }).click();
  await expect(cal.getByText(/^پایان: .* ۱۰ /)).toBeVisible();
  await v.getByRole('button', { name: 'ذخیره‌ی غذا' }).click();
  await expect(visible(page)).toHaveAttribute('data-screen', 'menu');
  const row = visible(page).getByRole('listitem').filter({ hasText: 'قورمه‌سبزی' });
  await expect(row.getByText('جشنواره ۲۰٪')).toBeVisible();
  await expect(row.getByText(/^تا (۱۰ |\S+ روز دیگر)/)).toBeVisible();
  const box = await row.boundingBox();
  expect(box!.width).toBeGreaterThan(300);
});
