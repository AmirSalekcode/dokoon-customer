import { expect, test, type Page } from '@playwright/test';
import { openCourier } from './helpers';

// KAN-99 (CP-15): trip history (scrolling to the end loads older trips), trip details with exact back
// (browser back = Android back), settlements; entries from the earnings and account tabs.
const top = (page: Page) => page.locator('main:not([hidden])');
const tab = (page: Page, name: string) =>
  page.getByRole('navigation', { name: 'بخش‌های پیک' }).getByRole('button', { name });
const rows = (page: Page) =>
  top(page).getByRole('list', { name: 'سفارش‌های تحویل‌شده' }).getByRole('listitem');
const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test('earnings → history: scrolling loads older trips; details; back is exact', async ({ page }) => {
  await openCourier(page);
  await tab(page, 'درآمد').click();
  await top(page)
    .getByRole('button', { name: /تاریخچه‌ی سفارش‌ها/ })
    .click();
  await expect(top(page)).toHaveAttribute('data-screen', 'hist');
  await expect(rows(page)).toHaveCount(20);
  // Infinite scroll: bring the end of the list into view.
  await top(page).getByRole('button', { name: 'نمایش سفارش‌های قدیمی‌تر' }).scrollIntoViewIfNeeded();
  await expect(rows(page)).toHaveCount(40);
  await top(page).getByRole('button', { name: 'نمایش سفارش‌های قدیمی‌تر' }).click();
  await expect(rows(page)).toHaveCount(45);
  await expect(top(page).getByText('پایان فهرست')).toBeVisible();
  expect(await overflow(page)).toBeLessThanOrEqual(0);

  await rows(page).nth(2).getByRole('button').click();
  await expect(top(page)).toHaveAttribute('data-screen', 'histd');
  await expect(top(page).getByRole('heading', { name: 'سفارش ۴۸۱۸' })).toBeVisible();
  await expect(top(page).getByText('درآمد شما')).toBeVisible();

  await page.goBack();
  await expect(top(page)).toHaveAttribute('data-screen', 'hist');
  await expect(rows(page)).toHaveCount(45);
  await page.goBack();
  await expect(top(page)).toHaveAttribute('data-screen', 'earn');
});

test('settlements from the account tab: pending marked, payout details; back is exact', async ({ page }) => {
  await openCourier(page);
  await tab(page, 'حساب').click();
  await top(page)
    .getByRole('button', { name: /تسویه‌حساب‌ها/ })
    .click();
  await expect(top(page)).toHaveAttribute('data-screen', 'settle');
  await expect(top(page).getByText('۱٬۳۲۰٬۰۰۰ تومان')).toBeVisible();
  await expect(top(page).getByText(/در انتظار واریز/)).toBeVisible();
  await expect(top(page).getByText(/واریز شد/)).toHaveCount(2);
  await top(page)
    .getByRole('button', { name: /۲٬۱۴۰٬۰۰۰ تومان/ })
    .click();
  await expect(top(page)).toHaveAttribute('data-screen', 'setd');
  await expect(top(page).getByText('تاریخ واریز')).toBeVisible();
  await page.goBack();
  await expect(top(page)).toHaveAttribute('data-screen', 'settle');
  await page.goBack();
  await expect(top(page)).toHaveAttribute('data-screen', 'account');
});

test.describe('dark, tablet 1024', () => {
  test.use({ viewport: { width: 1024, height: 768 }, colorScheme: 'dark' });
  test('history and settlements stay centred without horizontal scroll', async ({ page }) => {
    await openCourier(page);
    await tab(page, 'حساب').click();
    await top(page)
      .getByRole('button', { name: /تاریخچه‌ی سفارش‌ها/ })
      .click();
    await expect(rows(page)).toHaveCount(20);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await page.goBack();
    await top(page)
      .getByRole('button', { name: /تسویه‌حساب‌ها/ })
      .click();
    await expect(top(page).getByText('۲٬۱۴۰٬۰۰۰ تومان')).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
});
