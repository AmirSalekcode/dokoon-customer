import { expect, test } from '@playwright/test';

const banner = (page: import('@playwright/test').Page) =>
  page.getByRole('dialog', { name: 'رضایت استفاده از کوکی' });

test('first visit shows the cookie popup; «فقط ضروری» hides it for good', async ({ page }) => {
  await page.goto('/');
  await expect(banner(page)).toBeVisible();
  // App stays usable underneath (non-blocking): bottom nav is still clickable.
  await expect(page.getByRole('button', { name: 'حساب' })).toBeVisible();
  await banner(page).getByRole('button', { name: 'فقط ضروری' }).click();
  await expect(banner(page)).toHaveCount(0);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('dk-consent') ?? 'null'));
  expect(saved).toMatchObject({ version: 1, analytics: false });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'نزدیک شما' })).toBeVisible();
  await expect(banner(page)).toHaveCount(0);
});

test('popup fits the 390px frame and its buttons are ≥48px', async ({ page }) => {
  await page.goto('/');
  const box = await banner(page).boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  for (const b of await banner(page).getByRole('button').all()) {
    const r = await b.boundingBox();
    expect(r!.height, await b.innerText()).toBeGreaterThanOrEqual(48);
  }
});

test('settings → «تنظیمات کوکی» re-opens the choice', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'dk-consent',
      JSON.stringify({ version: 1, analytics: true, decidedAt: '2026-11-18' }),
    ),
  );
  await page.goto('/');
  await expect(banner(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'حساب' }).click();
  await page
    .locator('main:not([hidden])')
    .getByRole('button', { name: /تنظیمات/ })
    .click();
  await page.locator('main:not([hidden])').getByRole('button', { name: 'تنظیمات کوکی' }).click();
  await expect(banner(page)).toBeVisible();
});
