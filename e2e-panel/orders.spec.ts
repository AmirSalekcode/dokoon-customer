import { expect, test } from '@playwright/test';
import { openPanel, seedSession } from './helpers';

// KAN-63: orders list — tabs with counters, card actions, history date chips + pagination.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('dk-mock-neworder-ms', '0'));
  await seedSession(page);
});

const tab = (page: import('@playwright/test').Page, name: string) =>
  page.getByRole('tab', { name, exact: true });

test('tabs with counters, nav badge and card actions move orders between tabs', async ({ page }) => {
  await openPanel(page);
  await expect(tab(page, 'جدید ۲')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: 'سفارش‌ها، ۲ سفارش جدید' })).toBeVisible();
  await expect(page.getByTestId('order-tile')).toHaveCount(2);
  await expect(page.getByTestId('order-tile').first()).toContainText('مهلت پاسخ');

  await tab(page, 'در حال آماده‌سازی ۱').click();
  await page.getByRole('button', { name: 'سفارش آماده است' }).click();
  await expect(page.getByText('سفارش آماده شد؛ پیک مطلع می‌شود')).toBeVisible();
  await expect(tab(page, 'آماده / در مسیر ۳')).toBeVisible();
  await expect(page.getByText('سفارشی در حال آماده‌سازی نیست')).toBeVisible();

  await tab(page, 'آماده / در مسیر ۳').click();
  await page.getByRole('button', { name: 'تحویل به پیک شد' }).first().click();
  await expect(page.getByText('تحویل به پیک ثبت شد')).toBeVisible();
  await expect(page.getByRole('button', { name: 'تحویل به پیک شد' })).toHaveCount(1);
});

test('history: 7 days by default, «همه» pages with infinite scroll', async ({ page }) => {
  await openPanel(page);
  await tab(page, 'تاریخچه').click();
  const chips = page.getByRole('group', { name: 'بازه‌ی تاریخچه' });
  await expect(chips.getByRole('button', { name: '۷ روز' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('order-tile').first()).toBeVisible();

  await chips.getByRole('button', { name: 'همه' }).click();
  await expect(page.getByTestId('order-tile')).toHaveCount(10);
  await page.getByRole('button', { name: 'نمایش سفارش‌های قدیمی‌تر' }).scrollIntoViewIfNeeded();
  await expect(page.getByText('پایان فهرست')).toBeVisible();
  expect(await page.getByTestId('order-tile').count()).toBeGreaterThan(10);
});

test('tablet: list and detail side by side, tapping a card selects it', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await openPanel(page);
  const detail = page.getByRole('region', { name: 'جزئیات سفارش' });
  await expect(detail).toBeVisible();
  const first = page.getByTestId('order-tile').first();
  await first.getByRole('button', { name: /^جزئیات سفارش/ }).click();
  await expect(first.getByRole('button', { name: /^جزئیات سفارش/ })).toHaveAttribute('aria-current', 'true');
  // No horizontal scroll at either width.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
