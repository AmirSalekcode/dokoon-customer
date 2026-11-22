import { expect, test, type Page } from '@playwright/test';

// KAN-89 (CP-05): the courier shell — tabs (bottom bar < 720, side rail ≥ 720), exact back (browser back
// stands in for Android back: same handleSystemBack), one overlay at a time, global offline page, theme.
const tabs = (page: Page) => page.getByRole('navigation', { name: 'بخش‌های پیک' });
const tab = (page: Page, name: string) => tabs(page).getByRole('button', { name });
const visibleScreen = (page: Page) => page.locator('main:not([hidden])');
const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('phone 390×844', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('tabs sit in a bottom bar; switching shows the tab; browser back goes to orders, then warns', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(visibleScreen(page)).toHaveAttribute('data-screen', 'orders');
    const bar = await tabs(page).boundingBox();
    expect(bar!.y + bar!.height).toBeGreaterThan(780); // at the bottom
    expect(bar!.width).toBeGreaterThan(380); // full width
    for (const name of ['سفارش‌ها', 'درآمد', 'حساب'])
      expect((await tab(page, name).boundingBox())!.height).toBeGreaterThanOrEqual(56);

    await tab(page, 'حساب').click();
    await expect(visibleScreen(page)).toHaveAttribute('data-screen', 'account');
    await expect(tab(page, 'حساب')).toHaveAttribute('aria-current', 'page');

    await page.goBack();
    await expect(visibleScreen(page)).toHaveAttribute('data-screen', 'orders');
    await page.goBack();
    await expect(page.getByText('برای خروج دوباره بزنید')).toBeVisible();
    await expect(visibleScreen(page)).toHaveAttribute('data-screen', 'orders');
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });

  test('sign-out dialog: back closes it and stays on the account tab', async ({ page }) => {
    await page.goto('/');
    await tab(page, 'حساب').click();
    await page.getByRole('button', { name: 'خروج از حساب' }).click();
    const dlg = page.getByRole('alertdialog', { name: 'از حساب خارج می‌شوید؟' });
    await expect(dlg).toBeVisible();
    await page.goBack();
    await expect(dlg).toBeHidden();
    await expect(visibleScreen(page)).toHaveAttribute('data-screen', 'account');
  });

  test('offline: the courier offline page; online again: back on the same tab', async ({ page, context }) => {
    await page.goto('/');
    await tab(page, 'درآمد').click();
    await context.setOffline(true);
    await expect(page.getByRole('heading', { name: 'اینترنت متصل نیست' })).toBeVisible();
    await expect(page.getByText('برای دریافت سفارش‌ها باید به اینترنت وصل باشید')).toBeVisible();
    await expect(tabs(page)).toHaveCount(0);
    await context.setOffline(false);
    await expect(visibleScreen(page)).toHaveAttribute('data-screen', 'earn');
    await expect(tabs(page)).toBeVisible();
  });

  test('the dark switch themes the app at once and survives a reload (dk-theme)', async ({ page }) => {
    await page.goto('/');
    await tab(page, 'حساب').click();
    await page.getByRole('switch', { name: /حالت تیره/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await page.evaluate(() => localStorage.getItem('dk-theme'))).toBe('dark');
  });
});

test.describe('tablet 1024×768', () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  test('tabs become a side rail at the reading start (right in RTL), no horizontal scroll', async ({
    page,
  }) => {
    await page.goto('/');
    const rail = (await tabs(page).boundingBox())!;
    expect(rail.width).toBe(104);
    expect(rail.x + rail.width).toBeGreaterThan(1020); // right edge
    expect(rail.height).toBeGreaterThan(700);
    await tab(page, 'درآمد').click();
    await expect(visibleScreen(page)).toHaveAttribute('data-screen', 'earn');
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
});
