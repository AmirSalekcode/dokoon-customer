import { expect, test, type Page } from '@playwright/test';
import { openPanel, seedSession } from './helpers';

// KAN-67: dish editor — option group editing, photo upload to review, new dish, delete.
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

// A tiny valid JPEG-like payload is enough: the mock upload stores bytes, the browser resizes images.
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

test('edit an option group, save the dish, and see it after re-opening', async ({ page }) => {
  await editDish(page, 'چلوکباب کوبیده');
  const v = visible(page);
  await v.getByRole('button', { name: 'ویرایش گروه نوشیدنی' }).click();
  await expect(v.getByRole('heading', { name: 'ویرایش گروه گزینه' })).toBeVisible();
  await v.getByRole('button', { name: 'افزودن گزینه' }).click();
  await v.getByLabel('نام گزینه‌ی ۳').fill('آب معدنی');
  await v.getByLabel('قیمت گزینه‌ی ۳ (تومان)').fill('15000');
  await v.getByRole('switch', { name: 'انتخاب اجباری' }).click();
  await v.getByRole('button', { name: 'ذخیره‌ی گروه' }).click();

  const card = visible(page).getByRole('region', { name: 'گروه نوشیدنی' });
  await expect(card.getByText('آب معدنی')).toBeVisible();
  await expect(card.getByText('انتخاب ۱ مورد · اجباری')).toBeVisible();
  await visible(page).getByRole('button', { name: 'ذخیره‌ی غذا' }).click();
  await expect(visible(page)).toHaveAttribute('data-screen', 'menu');

  await visible(page).getByRole('button', { name: 'ویرایش چلوکباب کوبیده' }).click();
  await expect(
    visible(page).getByRole('region', { name: 'گروه نوشیدنی' }).getByText('آب معدنی'),
  ).toBeVisible();
});

test('photo upload goes to Dokoon review', async ({ page }) => {
  await editDish(page, 'جوجه‌کباب با استخوان');
  await visible(page)
    .getByTestId('dish-photo-file')
    .setInputFiles({ name: 'dish.png', mimeType: 'image/png', buffer: PNG_1PX });
  await expect(visible(page).getByRole('button', { name: /در انتظار تأیید دکون/ })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'عکس برای تأیید دکون فرستاده شد' })).toBeVisible();
});

test('new dish from a category, then delete it with confirmation', async ({ page }) => {
  await openPanel(page);
  await nav(page).getByRole('button', { name: 'منو' }).click();
  await visible(page)
    .getByRole('tab', { name: /^پیش‌غذا و نوشیدنی/ })
    .click();
  await visible(page).getByRole('button', { name: 'افزودن غذا' }).click();
  const v = visible(page);
  await v.getByLabel('نام غذا').fill('ماست موسیر');
  await v.getByLabel('قیمت', { exact: true }).fill('35000');
  await v.getByRole('button', { name: 'سالاد', exact: true }).click();
  await v.getByRole('button', { name: 'ذخیره‌ی غذا' }).click();
  await expect(visible(page)).toHaveAttribute('data-screen', 'menu');
  await expect(visible(page).getByRole('tab', { name: 'پیش‌غذا و نوشیدنی ۳' })).toBeVisible();

  await visible(page).getByRole('button', { name: 'ویرایش ماست موسیر' }).click();
  await visible(page).getByRole('button', { name: 'حذف این غذا' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'حذف غذا' }).click();
  await expect(visible(page)).toHaveAttribute('data-screen', 'menu');
  await expect(visible(page).getByRole('button', { name: 'ویرایش ماست موسیر' })).toHaveCount(0);
});

test('Android back from the group editor returns to the dish, then to the menu', async ({ page }) => {
  await editDish(page, 'چلوکباب کوبیده');
  await visible(page).getByRole('button', { name: 'افزودن گروه گزینه' }).click();
  await expect(visible(page)).toHaveAttribute('data-screen', 'group');
  await page.goBack();
  await expect(visible(page)).toHaveAttribute('data-screen', 'dish');
  await page.goBack();
  await expect(visible(page)).toHaveAttribute('data-screen', 'menu');
});
