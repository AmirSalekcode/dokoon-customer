import { expect, test, type Page } from '@playwright/test';

const visible = (page: Page) => page.locator('main:not([hidden])');

// Cookie popup is covered by consent.spec.ts; start with a saved decision here.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Returning user: onboarding done, city chosen (launch flow is covered by launch.spec.ts).
    if (!localStorage.getItem('dk-launch'))
      localStorage.setItem('dk-launch', JSON.stringify({ seenOnboarding: true, cityId: 'shahreza' }));
    if (!localStorage.getItem('dk-consent'))
      localStorage.setItem(
        'dk-consent',
        JSON.stringify({ version: 1, analytics: false, decidedAt: '2026-11-18' }),
      );
  });
});
const html = (page: Page) => page.locator('html');

async function openSettings(page: Page) {
  await page.goto('/');
  await expect(visible(page).getByRole('heading', { name: 'نزدیک شما' })).toBeVisible();
  await page.getByRole('button', { name: 'حساب' }).click();
  await visible(page)
    .getByRole('button', { name: /تنظیمات/ })
    .click();
  return visible(page).getByRole('radiogroup', { name: 'تم' });
}

test.describe('phone in dark mode, no saved choice', () => {
  test.use({ colorScheme: 'dark' });

  test('app starts dark before first paint and settings shows «مطابق گوشی»', async ({ page }) => {
    await page.goto('/');
    // Pre-paint script in index.html: dark from the very first frame.
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
    const bg = await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--bg').trim());
    expect(bg.toLowerCase()).toBe('#17120f');
    const group = await openSettings(page);
    await expect(group.getByRole('radio', { name: 'مطابق گوشی', exact: true })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(await page.evaluate(() => localStorage.getItem('dk-theme'))).toBeNull();
  });

  test('explicit «روشن» wins over the dark phone and survives reload', async ({ page }) => {
    const group = await openSettings(page);
    await group.getByRole('radio', { name: 'روشن', exact: true }).click();
    await expect(html(page)).not.toHaveAttribute('data-theme', 'dark');
    expect(await page.evaluate(() => localStorage.getItem('dk-theme'))).toBe('light');
    await page.reload();
    await expect(html(page)).not.toHaveAttribute('data-theme', 'dark');
  });
});

test.describe('phone in light mode', () => {
  test.use({ colorScheme: 'light' });

  test('app starts light; follows the phone live when it switches to dark', async ({ page }) => {
    await page.goto('/');
    await expect(html(page)).not.toHaveAttribute('data-theme', 'dark');
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(html(page)).not.toHaveAttribute('data-theme', 'dark');
  });

  test('explicit «تیره» persists; back to «مطابق گوشی» clears it', async ({ page }) => {
    const group = await openSettings(page);
    await group.getByRole('radio', { name: 'تیره', exact: true }).click();
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
    const g2 = await openSettings(page);
    await g2.getByRole('radio', { name: 'مطابق گوشی', exact: true }).click();
    await expect(html(page)).not.toHaveAttribute('data-theme', 'dark');
    expect(await page.evaluate(() => localStorage.getItem('dk-theme'))).toBeNull();
  });
});
