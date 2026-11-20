import { expect, test } from '@playwright/test';
import { openPanel, seedSession } from './helpers';

// KAN-62: live connection loss → offline page → back → list up to date (mock stream outage).
type Mocks = { stream: { outage: (on: boolean) => void; connected: number }; addOrder: () => unknown };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('dk-mock-neworder-ms', '0'));
  await seedSession(page);
});

test('connection lost → offline page; restored → page closes and the list is synced', async ({ page }) => {
  await openPanel(page);
  const summary = page.getByTestId('orders-summary');
  await expect(summary).toContainText('۲ سفارش جدید');
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { __dkPanelMocks: Mocks }).__dkPanelMocks.stream.connected),
    )
    .toBe(1);

  await page.evaluate(() =>
    (window as unknown as { __dkPanelMocks: Mocks }).__dkPanelMocks.stream.outage(true),
  );
  await expect(page.getByRole('heading', { name: 'اینترنت متصل نیست' })).toBeVisible({ timeout: 6000 });

  // A new order reaches the server while this device is disconnected.
  await page.evaluate(() => (window as unknown as { __dkPanelMocks: Mocks }).__dkPanelMocks.addOrder());
  await page.evaluate(() =>
    (window as unknown as { __dkPanelMocks: Mocks }).__dkPanelMocks.stream.outage(false),
  );

  await expect(page.getByRole('heading', { name: 'اینترنت متصل نیست' })).toBeHidden({ timeout: 10_000 });
  await expect(page.locator('main:not([hidden])')).toHaveAttribute('data-screen', 'orders');
  await expect(summary).toContainText('۳ سفارش جدید');
});

test('a live new order updates the list without reload', async ({ page }) => {
  await openPanel(page);
  await expect(page.getByTestId('orders-summary')).toContainText('۲ سفارش جدید');
  await page.evaluate(() => {
    const m = (window as unknown as { __dkPanelMocks: Mocks & { stream: { emit: (x: unknown) => void } } })
      .__dkPanelMocks;
    m.stream.emit({ event: 'order.created', data: m.addOrder() });
  });
  await expect(page.getByTestId('orders-summary')).toContainText('۳ سفارش جدید');
});
