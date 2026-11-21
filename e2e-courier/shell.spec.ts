import { expect, test, type Page } from '@playwright/test';

// KAN-85 (CP-01): the empty courier shell boots with the shared font, theme and RTL as the courier app.
// Screens arrive from KAN-89 (shell) and KAN-90 (login).
const title = (page: Page) => page.getByRole('heading', { name: 'دکون پیک', level: 1 });
const css = (prop: string) => getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test('boots Persian RTL with Yekan Bakh, marked as the courier app and never indexed', async ({ page }) => {
  await page.goto('/');
  await expect(title(page)).toBeVisible();
  const html = page.locator('html');
  await expect(html).toHaveAttribute('dir', 'rtl');
  await expect(html).toHaveAttribute('lang', 'fa');
  await expect(html).toHaveAttribute('data-app', 'courier');
  await expect(page).toHaveTitle('دکون پیک');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');

  expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain('Yekan Bakh');
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('700 16px "Yekan Bakh"'))).toBe(true);
  expect(await overflow(page)).toBeLessThanOrEqual(0);
});

test('the header is the orange courier gradient with a white logo, and green is repainted orange', async ({
  page,
}) => {
  await page.goto('/');
  await expect(title(page)).toBeVisible();
  const header = page.getByRole('banner');
  await expect(header).toContainText('پیک');
  expect(await header.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain(
    'linear-gradient(160deg, rgb(194, 65, 12), rgb(228, 80, 30))',
  );
  const resolve = (token: string) =>
    page.evaluate((t) => {
      const probe = document.createElement('div');
      probe.style.color = `var(${t})`;
      document.body.append(probe);
      const c = getComputedStyle(probe).color;
      probe.remove();
      return c;
    }, token);
  expect(await resolve('--logo1')).toBe('rgb(255, 255, 255)');
  // Shared components read --success; in the courier app it resolves to the primary orange.
  expect(await resolve('--success')).toBe('rgb(228, 80, 30)');
});

test.describe('phone in dark mode', () => {
  test.use({ colorScheme: 'dark' });

  test('starts dark before first paint; the header stays orange', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect((await page.evaluate(css, '--bg')).toLowerCase()).toBe('#17120f');
    expect(await page.getByRole('banner').evaluate((el) => getComputedStyle(el).backgroundImage)).toContain(
      'rgb(228, 80, 30)',
    );
  });
});

test('a saved light choice (dk-theme) wins over a dark phone', async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: 'dark' });
  await ctx.addInitScript(() => localStorage.setItem('dk-theme', 'light'));
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(title(page)).toBeVisible();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');
  await ctx.close();
});

test('deep links serve the courier shell, not another app', async ({ page }) => {
  await page.goto('/orders/123');
  await expect(title(page)).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-app', 'courier');
});

test('has its own web app manifest «دکون پیک»', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const manifest = await (await request.get(href!)).json();
  expect(manifest.name).toBe('دکون پیک');
  expect(manifest.dir).toBe('rtl');
  expect(manifest.lang).toBe('fa');
});

test('works at tablet width (≥720) without horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/');
  await expect(title(page)).toBeVisible();
  expect(await overflow(page)).toBeLessThanOrEqual(0);
});
