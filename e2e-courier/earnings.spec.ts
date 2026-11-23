import { expect, test, type Page } from '@playwright/test';
import { openCourier } from './helpers';

// KAN-98 (CP-14): the earnings tab — period tabs, balance card with the sample note, four stat cards and
// the bar chart, all from the (mock) server; the global offline page covers it and leaves the numbers.
const top = (page: Page) => page.locator('main:not([hidden])');
const tab = (page: Page, name: string) =>
  page.getByRole('navigation', { name: 'بخش‌های پیک' }).getByRole('button', { name });
const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function openEarnings(page: Page) {
  await openCourier(page);
  await tab(page, 'درآمد').click();
  await expect(top(page)).toHaveAttribute('data-screen', 'earn');
  await expect(top(page).getByRole('region', { name: 'مانده‌ی حساب' })).toContainText('۱٬۳۲۰٬۰۰۰ تومان');
}

test('today first; balance is labelled sample; week and month load their own numbers', async ({ page }) => {
  await openEarnings(page);
  const balance = top(page).getByRole('region', { name: 'مانده‌ی حساب' });
  await expect(balance).toContainText('نمونه');
  await expect(balance).toContainText('۵۹۸٬۰۰۰ تومان');
  await expect(top(page).getByRole('tab', { name: 'امروز' })).toHaveAttribute('aria-selected', 'true');
  await expect(top(page).getByText('۴۸۰٬۰۰۰ تومان')).toBeVisible();
  await expect(top(page).getByRole('img', { name: /درآمد ساعتی امروز/ })).toBeVisible();

  await top(page).getByRole('tab', { name: 'این هفته' }).click();
  await expect(top(page).getByText('۲٬۸۶۰٬۰۰۰ تومان')).toBeVisible();
  await top(page).getByRole('tab', { name: 'این ماه' }).click();
  await expect(top(page).getByText('۱۱٬۴۰۰٬۰۰۰ تومان')).toBeVisible();
  await expect(top(page).getByRole('img', { name: /درآمد هفتگی این ماه/ })).toBeVisible();
  expect(await overflow(page)).toBeLessThanOrEqual(0);
});

test('dark theme keeps the tab readable without horizontal scroll', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await openEarnings(page);
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).not.toBe('rgb(255, 255, 255)');
  expect(await overflow(page)).toBeLessThanOrEqual(0);
});

test('offline: the offline page covers the tab; back online the numbers are still there and months load', async ({
  page,
}) => {
  await openEarnings(page);
  await page.context().setOffline(true);
  await expect(page.getByRole('heading', { name: 'اینترنت متصل نیست' })).toBeVisible();
  await page.context().setOffline(false);
  await expect(top(page)).toHaveAttribute('data-screen', 'earn');
  await expect(top(page).getByText('۴۸۰٬۰۰۰ تومان')).toBeVisible();
  await top(page).getByRole('tab', { name: 'این ماه' }).click();
  await expect(top(page).getByText('۱۱٬۴۰۰٬۰۰۰ تومان')).toBeVisible();
});

test.describe('tablet 1024', () => {
  test.use({ viewport: { width: 1024, height: 768 } });
  test('the tab sits next to the side rail with all four stat cards', async ({ page }) => {
    await openEarnings(page);
    await expect(top(page).getByText('ساعت آنلاین')).toBeVisible();
    await expect(top(page).getByText('میانگین هر سفارش')).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
});
