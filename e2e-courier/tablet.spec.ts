import { expect, test, type Locator, type Page } from '@playwright/test';
import { openCourier } from './helpers';

// KAN-102 (CP-18): the ≥720 layout — offers in two columns, the four stats in one row, the order step beside
// its map, the bottom button not stretched across the screen — and the phone layout unchanged.
const top = (page: Page) => page.locator('main:not([hidden])');
const cards = (page: Page) => top(page).getByRole('button', { name: /کیلومتر/ });
const box = async (l: Locator) => (await l.boundingBox())!;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('dkc-mock-offer-ms', '0'));
});

test('tablet: offers side by side, stats in one row, order step beside its map', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await openCourier(page);
  await top(page).getByRole('switch').click();
  await expect(cards(page)).toHaveCount(3);
  const [a, b] = [await box(cards(page).nth(0)), await box(cards(page).nth(1))];
  expect(Math.abs(a.y - b.y)).toBeLessThan(2); // same row
  expect(b.x).toBeLessThan(a.x); // RTL: the second card is to the left

  await cards(page).first().click();
  await page.getByRole('button', { name: 'قبول سفارش' }).click();
  await expect(top(page)).toHaveAttribute('data-screen', 'order');
  const map = await box(top(page).getByRole('button', { name: /نشان/ }));
  const card = await box(top(page).getByRole('region', { name: /کبابی سنتی زاگرس/ }));
  expect(map.x + map.width).toBeLessThanOrEqual(card.x); // map on the left of the step
  const dock = await box(top(page).getByRole('button', { name: 'به رستوران رسیدم' }));
  expect(dock.width).toBeLessThanOrEqual(720);

  await page.goBack();
  await page.getByRole('navigation', { name: 'بخش‌های پیک' }).getByRole('button', { name: 'درآمد' }).click();
  await expect(top(page)).toHaveAttribute('data-screen', 'earn');
  const stats = top(page).getByText(/درآمد امروز|^سفارش‌ها$|ساعت آنلاین|میانگین هر سفارش/);
  await expect(stats).toHaveCount(4);
  const ys = await stats.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
  expect(new Set(ys).size).toBe(1);
});

test('phone: one column, the map above the step', async ({ page }) => {
  await openCourier(page);
  await top(page).getByRole('switch').click();
  await expect(cards(page)).toHaveCount(3);
  const [a, b] = [await box(cards(page).nth(0)), await box(cards(page).nth(1))];
  expect(b.y).toBeGreaterThan(a.y + a.height - 1);
  await cards(page).first().click();
  await page.getByRole('button', { name: 'قبول سفارش' }).click();
  const map = await box(top(page).getByRole('button', { name: /نشان/ }));
  const card = await box(top(page).getByRole('region', { name: /کبابی سنتی زاگرس/ }));
  expect(map.y + map.height).toBeLessThanOrEqual(card.y);
});
