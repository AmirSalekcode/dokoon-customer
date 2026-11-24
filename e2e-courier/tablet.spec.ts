import { expect, test, type Page } from '@playwright/test';
import { openCourier } from './helpers';

// KAN-102 (CP-18): the ≥ 720 layout with CSS media queries (no separate tablet screens): offers in two
// columns, stats in one row of four, order = map | details, centred windows ≤ 520, narrow action bar.
test.use({ viewport: { width: 1024, height: 768 } });
const top = (page: Page) => page.locator('main:not([hidden])');
const box = async (page: Page, loc: ReturnType<Page['locator']>) => (await loc.boundingBox())!;

test('offers sit in two columns; earnings stats in one row', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('dkc-mock-offer-ms', '0'));
  await openCourier(page);
  await top(page).getByRole('switch').click();
  const cards = top(page).getByRole('button', { name: /کیلومتر/ });
  await expect(cards).toHaveCount(3);
  const [a, b] = [await box(page, cards.nth(0)), await box(page, cards.nth(1))];
  expect(Math.abs(a.y - b.y)).toBeLessThan(2); // same row
  expect(a.x).toBeGreaterThan(b.x); // RTL: the first card starts on the right

  await page.getByRole('navigation', { name: 'بخش‌های پیک' }).getByRole('button', { name: 'درآمد' }).click();
  const labels = ['درآمد امروز', 'سفارش‌ها', 'ساعت آنلاین', 'میانگین هر سفارش'];
  const ys = await Promise.all(
    labels.map(async (l) => (await box(page, top(page).getByText(l, { exact: true }))).y),
  );
  expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(2);
});

test('order: map beside the place card; the action bar and the reason sheet stay narrow', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('dkc-mock-offer-ms', '0'));
  await openCourier(page);
  await top(page).getByRole('switch').click();
  await top(page)
    .getByRole('button', { name: /کیلومتر/ })
    .first()
    .click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'قبول سفارش' }).click();
  await expect(top(page)).toHaveAttribute('data-screen', 'order');
  const map = await box(page, top(page).getByRole('button', { name: /مسیریابی با نشان/ }));
  const call = await box(page, top(page).getByRole('button', { name: /تماس/ }));
  expect(map.x).toBeGreaterThan(call.x + call.width); // map column on the right, details on the left
  const cta = await box(page, top(page).getByRole('button', { name: 'به رستوران رسیدم' }));
  expect(cta.width).toBeLessThanOrEqual(720);

  await top(page).getByRole('button', { name: 'انصراف از سفارش' }).click();
  const sheet = await box(page, page.getByRole('dialog'));
  expect(sheet.width).toBeLessThanOrEqual(520);
  expect(Math.abs(sheet.x + sheet.width / 2 - 512)).toBeLessThan(4); // centred
});
