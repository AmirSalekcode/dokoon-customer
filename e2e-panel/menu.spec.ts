import { expect, test, type Page } from '@playwright/test';
import { openPanel, seedSession } from './helpers';

// KAN-66: menu tab — category tabs, instant availability switch, category manager (390 and 1024 wide).
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('dk-mock-neworder-ms', '0'));
  await seedSession(page);
});

const visible = (page: Page) => page.locator('main:not([hidden])');
const nav = (page: Page) => page.getByRole('navigation', { name: 'بخش‌های رستوران' });

async function openMenu(page: Page) {
  await openPanel(page);
  await nav(page).getByRole('button', { name: 'منو' }).click();
  await expect(visible(page).getByRole('list', { name: 'غذاهای منو' })).toBeVisible();
}

test('availability switch is saved: it survives leaving and re-opening the menu', async ({ page }) => {
  await openMenu(page);
  const sw = visible(page).getByRole('switch', { name: 'موجود بودن چلوکباب کوبیده' });
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByRole('status').filter({ hasText: '«چلوکباب کوبیده» ناموجود شد' })).toBeVisible();

  await nav(page).getByRole('button', { name: 'سفارش‌ها' }).click();
  await nav(page).getByRole('button', { name: 'منو' }).click();
  await expect(visible(page).getByRole('switch', { name: 'موجود بودن چلوکباب کوبیده' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
});

test('category tabs filter; the category manager renames and adds', async ({ page }) => {
  await openMenu(page);
  await visible(page).getByRole('tab', { name: 'پیش‌غذا و نوشیدنی ۲' }).click();
  await expect(visible(page).getByRole('list', { name: 'غذاهای منو' }).getByRole('listitem')).toHaveCount(2);

  await visible(page).getByRole('button', { name: 'مدیریت دسته‌ها' }).click();
  await expect(visible(page).getByRole('heading', { name: 'دسته‌بندی‌های منو' })).toBeVisible();
  await expect(nav(page)).toHaveCount(0);
  await visible(page).getByRole('button', { name: 'حذف دسته‌ی کباب‌ها' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'اول غذاهای این دسته را به دسته‌ی دیگری منتقل کنید' }),
  ).toBeVisible();

  const first = visible(page).getByRole('textbox').first();
  await first.fill('کباب ذغالی');
  await visible(page).getByRole('button', { name: 'افزودن دسته' }).click();
  await visible(page).getByLabel('دسته‌ی تازه').fill('دسر');
  await visible(page).getByRole('button', { name: 'ذخیره‌ی دسته‌ها' }).click();

  await expect(visible(page)).toHaveAttribute('data-screen', 'menu');
  await expect(visible(page).getByRole('tab', { name: 'کباب ذغالی ۳' })).toBeVisible();
  await expect(visible(page).getByRole('tab', { name: 'دسر', exact: true })).toBeVisible();
});

test('Android/browser back from the category manager returns to the menu', async ({ page }) => {
  await openMenu(page);
  await visible(page).getByRole('button', { name: 'مدیریت دسته‌ها' }).click();
  await expect(visible(page)).toHaveAttribute('data-screen', 'cats');
  await page.goBack();
  await expect(visible(page)).toHaveAttribute('data-screen', 'menu');
  await expect(nav(page).getByRole('button', { name: 'منو' })).toHaveAttribute('aria-current', 'page');
});

test.describe('tablet 1024', () => {
  test.use({ viewport: { width: 1024, height: 768 } });
  test('dishes sit in two columns', async ({ page }) => {
    await openMenu(page);
    const items = visible(page).getByRole('list', { name: 'غذاهای منو' }).getByRole('listitem');
    const a = await items.nth(0).boundingBox();
    const b = await items.nth(1).boundingBox();
    expect(a && b && Math.abs(a.y - b.y) < 2).toBe(true);
  });
});
