import { expect, test, type Page } from '@playwright/test';
import { openCourier } from './helpers';

// KAN-96 (CP-12): accepted order → to the restaurant (map links) → pickup (tick every dish) → customer leg;
// withdraw before pickup.
const top = (page: Page) => page.locator('main:not([hidden])');
const cards = (page: Page) => top(page).getByRole('button', { name: /کیلومتر/ });
const alert = (page: Page) => page.getByRole('alertdialog', { name: 'سفارش جدید برای شما' });

async function acceptFirst(page: Page) {
  await page.addInitScript(() => localStorage.setItem('dkc-mock-offer-ms', '0'));
  await openCourier(page);
  await top(page).getByRole('switch').click();
  await expect(cards(page)).toHaveCount(3);
  await cards(page).first().click();
  await alert(page).getByRole('button', { name: 'قبول سفارش' }).click();
  await expect(top(page)).toHaveAttribute('data-screen', 'order');
}

test('to the restaurant → pickup → on to the customer', async ({ page }) => {
  await acceptFirst(page);
  await expect(top(page).getByRole('heading', { name: /سفارش #/ })).toBeVisible();
  await expect(top(page)).toContainText('کبابی سنتی زاگرس');
  await expect(top(page)).toContainText('۰٫۸ کیلومتر');
  // The customer is not shown before pickup.
  await expect(top(page)).not.toContainText('زهرا نوری');

  // Map links open in a new tab (captured, not followed).
  await page.evaluate(() => {
    (window as unknown as { __opened: string[] }).__opened = [];
    window.open = (u?: string | URL) => {
      (window as unknown as { __opened: string[] }).__opened.push(String(u));
      return null;
    };
  });
  await top(page).getByRole('button', { name: /بلد/ }).click();
  expect(await page.evaluate(() => (window as unknown as { __opened: string[] }).__opened)).toHaveLength(1);

  const arrived = top(page).getByRole('button', { name: 'به رستوران رسیدم' });
  expect((await arrived.boundingBox())!.height).toBeGreaterThanOrEqual(56);
  await arrived.click();
  const picked = top(page).getByRole('button', { name: 'سفارش را تحویل گرفتم' });
  await expect(picked).toBeDisabled();
  const boxes = top(page).getByRole('checkbox');
  const n = await boxes.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) await boxes.nth(i).click();
  await expect(picked).toBeEnabled();
  await picked.click();
  await expect(top(page).getByRole('button', { name: 'به مشتری رسیدم' })).toBeVisible();
  await expect(top(page).getByRole('button', { name: 'انصراف از سفارش' })).toHaveCount(0);

  // Back to the tab: the banner shows the new step.
  await page.goBack();
  await expect(top(page).getByRole('button', { name: /سفارش در جریان/ })).toContainText('در راه مشتری');
});

test('report a problem at pickup; withdraw before pickup returns to the offers', async ({ page }) => {
  await acceptFirst(page);
  await top(page).getByRole('button', { name: 'به رستوران رسیدم' }).click();
  await top(page).getByRole('button', { name: 'مشکل در سفارش دارم' }).click();
  await page.getByRole('radio', { name: 'بسته‌بندی آسیب دیده' }).click();
  await page.getByRole('button', { name: 'ثبت مشکل' }).click();
  await expect(page.getByText('مشکل ثبت شد')).toBeVisible();

  await top(page).getByRole('button', { name: 'انصراف از سفارش' }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByRole('radio', { name: 'مسیر بسته است' }).click();
  await sheet.getByRole('button', { name: 'انصراف از سفارش' }).click();
  await expect(top(page)).toHaveAttribute('data-screen', 'orders');
  await expect(page.getByText('از سفارش انصراف دادید')).toBeVisible();
  await expect(top(page).getByRole('button', { name: /سفارش در جریان/ })).toHaveCount(0);
  await expect(top(page).getByRole('switch')).toHaveAttribute('aria-checked', 'true');
});
