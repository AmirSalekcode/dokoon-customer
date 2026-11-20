import { expect, test } from '@playwright/test';

// KAN-55: the empty panel shell boots with the shared font, theme and RTL, as the restaurant app.
const css = (prop: string) => getComputedStyle(document.documentElement).getPropertyValue(prop).trim();

test('boots Persian RTL with Yekan Bakh, marked as the restaurant app and never indexed', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('banner')).toBeVisible();
  const html = page.locator('html');
  await expect(html).toHaveAttribute('dir', 'rtl');
  await expect(html).toHaveAttribute('lang', 'fa');
  await expect(html).toHaveAttribute('data-app', 'restaurant');
  await expect(page).toHaveTitle('دکون رستوران');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');

  expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain('Yekan Bakh');
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('700 16px "Yekan Bakh"'))).toBe(true);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('restaurant tokens apply and the shared green is repainted orange', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('banner')).toBeVisible();
  expect((await page.evaluate(css, '--hd')).toLowerCase()).toBe('#1f1a17');
  // Shared components read --success; in the panel it resolves to the primary orange.
  const success = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.color = 'var(--success)';
    document.body.append(probe);
    const c = getComputedStyle(probe).color;
    probe.remove();
    return c;
  });
  expect(success).toBe('rgb(228, 80, 30)');
});

test.describe('phone in dark mode', () => {
  test.use({ colorScheme: 'dark' });

  test('starts dark before first paint with the dark restaurant tokens', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect((await page.evaluate(css, '--bg')).toLowerCase()).toBe('#17120f');
    expect((await page.evaluate(css, '--hd')).toLowerCase()).toBe('#0d0907');
  });
});

test('a saved light choice (dk-theme) wins over a dark phone', async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: 'dark' });
  await ctx.addInitScript(() => localStorage.setItem('dk-theme', 'light'));
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');
  await ctx.close();
});

test('deep links serve the panel shell, not the customer app', async ({ page }) => {
  await page.goto('/orders/123');
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-app', 'restaurant');
});

test('has its own web app manifest «دکون رستوران»', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const manifest = await (await request.get(href!)).json();
  expect(manifest.name).toBe('دکون رستوران');
  expect(manifest.dir).toBe('rtl');
});

test('works at tablet width (≥720) without horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/');
  await expect(page.getByRole('banner')).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
