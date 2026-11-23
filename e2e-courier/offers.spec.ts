import { expect, test, type Page } from '@playwright/test';
import { openCourier } from './helpers';

// KAN-94 (CP-10): live offers over the (mock) socket, neighbourhoods only, another courier taking one,
// and offline emptying the list.
const top = (page: Page) => page.locator('main:not([hidden])');
const sw = (page: Page) => top(page).getByRole('switch');
const cards = (page: Page) => top(page).getByRole('button', { name: /کیلومتر/ });
type Mocks = { stream: { takeByOther: (id: string) => void; pushOffer: () => void; connected: number } };
const mocks = (page: Page, fn: (m: Mocks) => unknown) =>
  page.evaluate(`(${fn.toString()})(window.__dkCourierMocks)`);

test.beforeEach(async ({ page }) => {
  // No timed demo offers: the test pushes them.
  await page.addInitScript(() => localStorage.setItem('dkc-mock-offer-ms', '0'));
});

test('online: nearby offers arrive, a taken one disappears, a new one appears; offline empties', async ({
  page,
}) => {
  await openCourier(page);
  await expect(top(page).getByRole('heading', { name: 'آفلاین هستید' })).toBeVisible();
  await expect(cards(page)).toHaveCount(0);

  await sw(page).click();
  await expect(top(page).getByRole('heading', { name: 'سفارش‌های نزدیک شما' })).toBeVisible();
  await expect(cards(page)).toHaveCount(3);
  await expect(cards(page).first()).toContainText('کبابی سنتی زاگرس');
  expect((await cards(page).first().boundingBox())!.height).toBeGreaterThanOrEqual(56);
  // Neighbourhoods only: no house number or phone anywhere on the tab.
  await expect(top(page)).not.toContainText('پلاک');

  await mocks(page, (m) => m.stream.takeByOther('of1'));
  await expect(cards(page)).toHaveCount(2);
  await expect(top(page)).not.toContainText('کبابی سنتی زاگرس');

  await mocks(page, (m) => m.stream.pushOffer());
  await expect(cards(page)).toHaveCount(3);

  await sw(page).click();
  await expect(sw(page)).toHaveAttribute('aria-checked', 'false');
  await expect(cards(page)).toHaveCount(0);
  await expect.poll(() => mocks(page, (m) => m.stream.connected)).toBe(0);
});

test('offers at tablet width without horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await openCourier(page);
  await sw(page).click();
  await expect(cards(page)).toHaveCount(3);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
  ).toBeLessThanOrEqual(0);
});
