import { expect, test, type Page } from '@playwright/test';
import { openPanel, seedSession } from './helpers';

// KAN-64: a live new order → full-screen alert → accept (PrepSheet) or reject (ReasonSheet).
type Mocks = { stream: { emit: (m: unknown) => void }; addOrder: () => unknown };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('dk-mock-neworder-ms', '0'));
  await seedSession(page);
});

async function newOrder(page: Page) {
  await page.evaluate(() => {
    const m = (window as unknown as { __dkPanelMocks: Mocks }).__dkPanelMocks;
    m.stream.emit({ event: 'order.created', data: m.addOrder() });
  });
}

test('accept: alert → prep time → order is in «در حال آماده‌سازی»', async ({ page }) => {
  await openPanel(page);
  await newOrder(page);
  const alert = page.getByRole('alertdialog');
  await expect(alert.getByRole('heading', { name: 'سفارش جدید!' })).toBeVisible();
  await expect(alert.getByRole('timer')).toHaveAccessibleName(/[۰-۹]:[۰-۹]{2}/);
  await alert.getByRole('button', { name: 'قطع صدا' }).click();
  await expect(alert.getByRole('button', { name: 'صدا قطع است' })).toBeVisible();

  await alert.getByRole('button', { name: 'پذیرش سفارش' }).click();
  const sheet = page.getByRole('dialog', { name: 'زمان آماده‌سازی' });
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await sheet.getByRole('button', { name: /^۳۰/ }).click();
  await expect(sheet.getByText('مشتری: آماده‌سازی ۳۰ دقیقه + زمان مسیر پیک')).toBeVisible();
  await sheet.getByRole('button', { name: 'تأیید و پذیرش سفارش' }).click();

  await expect(page.getByText('سفارش پذیرفته شد')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'در حال آماده‌سازی ۲', exact: true })).toBeVisible();
});

test('reject: alert → reason → alert closes, order leaves «جدید»', async ({ page }) => {
  await openPanel(page);
  await expect(page.getByRole('tab', { name: 'جدید ۲', exact: true })).toBeVisible();
  await newOrder(page);
  await expect(page.getByRole('tab', { name: 'جدید ۳', exact: true })).toBeVisible();
  await page.getByRole('alertdialog').getByRole('button', { name: 'رد سفارش' }).click();
  const reasons = page.getByRole('radiogroup', { name: 'دلیل رد سفارش' });
  await reasons.getByRole('radio', { name: 'مواد اولیه تمام شده' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'رد سفارش' }).click();
  await expect(page.getByText('سفارش رد شد')).toBeVisible();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'جدید ۲', exact: true })).toBeVisible();
});
