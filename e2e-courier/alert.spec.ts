import { expect, test, type Page } from '@playwright/test';
import { openCourier } from './helpers';

// KAN-95 (CP-11): the full-screen offer alert — opened by a live offer, accept (atomic on the server),
// another courier winning (live and as a late 409), reject, and the server deadline.
const top = (page: Page) => page.locator('main:not([hidden])');
const sw = (page: Page) => top(page).getByRole('switch');
const cards = (page: Page) => top(page).getByRole('button', { name: /کیلومتر/ });
const alert = (page: Page) => page.getByRole('alertdialog', { name: 'سفارش جدید برای شما' });
/** Calls the mock stream in the page (`__dkCourierMocks`, mock builds only). */
const stream = (page: Page, call: string) =>
  page.evaluate(`window.__dkCourierMocks.stream.${call}`) as Promise<unknown>;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('dkc-mock-offer-ms', '0'));
  await openCourier(page);
  await sw(page).click();
  await expect(cards(page)).toHaveCount(3);
});

test('a live offer opens the alert; accept → the order is yours', async ({ page }) => {
  await stream(page, 'pushOffer()');
  await expect(alert(page)).toBeVisible();
  const accept = alert(page).getByRole('button', { name: 'قبول سفارش' });
  expect((await accept.boundingBox())!.height).toBeGreaterThanOrEqual(64);
  await expect(alert(page).getByRole('timer')).toHaveAttribute('aria-label', /ثانیه برای پاسخ/);
  await accept.click();
  await expect(alert(page)).toBeHidden();
  await expect(top(page)).toHaveAttribute('data-screen', 'order');
  await expect(page.getByText('سفارش مال شماست')).toBeVisible();
  // Back on the orders tab: the banner instead of offers, and no going offline.
  await page.goBack();
  await expect(top(page).getByRole('button', { name: /سفارش در جریان/ })).toBeVisible();
  await expect(cards(page)).toHaveCount(0);
  await sw(page).click();
  await expect(page.getByText('تا پایان سفارش نمی‌توانید آفلاین شوید')).toBeVisible();
  await expect(sw(page)).toHaveAttribute('aria-checked', 'true');
});

test('two couriers: the other one wins while the alert is open', async ({ page }) => {
  await cards(page).first().click();
  await expect(alert(page)).toBeVisible();
  await stream(page, "takeByOther('of1')");
  await expect(alert(page)).toBeHidden();
  await expect(page.getByText('پیک دیگری زودتر این سفارش را برداشت')).toBeVisible();
  await expect(cards(page)).toHaveCount(2);
});

test('two couriers: the other one won a moment earlier → accept gets 409', async ({ page }) => {
  await cards(page).first().click();
  await stream(page, "takeByOtherLate('of1')");
  await alert(page).getByRole('button', { name: 'قبول سفارش' }).click();
  await expect(alert(page)).toBeHidden();
  await expect(page.getByText('پیک دیگری زودتر این سفارش را برداشت')).toBeVisible();
  await expect(top(page)).toHaveAttribute('data-screen', 'orders');
});

test('reject closes the alert and drops the offer; back only hides it', async ({ page }) => {
  await cards(page).nth(1).click();
  await expect(alert(page)).toBeVisible();
  await page.goBack();
  await expect(alert(page)).toBeHidden();
  await expect(cards(page)).toHaveCount(3);
  await cards(page).nth(1).click();
  await alert(page).getByRole('button', { name: 'رد کردن' }).click();
  await expect(alert(page)).toBeHidden();
  await expect(cards(page)).toHaveCount(2);
});

test('the server deadline passes: the alert closes as expired', async ({ page }) => {
  await page.clock.install();
  await cards(page).first().click();
  await expect(alert(page)).toBeVisible();
  await page.clock.fastForward(31_000);
  await expect(alert(page)).toBeHidden();
  await expect(page.getByText('زمان این پیشنهاد تمام شد')).toBeVisible();
});

test('toasts never cover the alert buttons', async ({ page }) => {
  await page.evaluate('window.__dkCourierMocks.stream.pushOffer()');
  await expect(alert(page)).toBeVisible();
  // «آنلاین شدید» from the switch is still showing: it must sit above the card, not on the buttons.
  const toast = page.getByText('آنلاین شدید', { exact: true });
  await expect(toast).toBeVisible();
  const accept = (await alert(page).getByRole('button', { name: 'قبول سفارش' }).boundingBox())!;
  const box = (await toast.boundingBox())!;
  expect(box.y + box.height).toBeLessThan(accept.y);
});
