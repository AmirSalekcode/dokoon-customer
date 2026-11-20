import { expect, test, type Page } from '@playwright/test';

// KAN-58: tabs, exact back (UI and browser/Android back), open/closed switch — at 390 and 1024 wide.
const visible = (page: Page) => page.locator('main:not([hidden])');
const nav = (page: Page) => page.getByRole('navigation', { name: 'بخش‌های رستوران' });

test.beforeEach(async ({ page }) => {
  // No demo orders on a timer during these tests.
  await page.addInitScript(() => localStorage.setItem('dk-mock-neworder-ms', '0'));
});

async function open(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'کبابی سنتی زاگرس' })).toBeVisible();
}

for (const [label, size] of [
  ['phone 390', { width: 390, height: 844 }],
  ['tablet 1024', { width: 1024, height: 768 }],
] as const) {
  test.describe(label, () => {
    test.use({ viewport: size });

    test('four tabs; switching resets the stack; back returns exactly', async ({ page }) => {
      await open(page);
      await expect(nav(page).getByRole('button')).toHaveText(['سفارش‌ها', 'منو', 'گزارش', 'حساب']);
      await nav(page).getByRole('button', { name: 'حساب' }).click();
      await expect(nav(page).getByRole('button', { name: 'حساب' })).toHaveAttribute('aria-current', 'page');
      await visible(page)
        .getByRole('button', { name: /راهنما و پشتیبانی/ })
        .click();
      await expect(visible(page).getByRole('heading', { name: 'راهنما و پشتیبانی', level: 1 })).toBeVisible();
      await expect(nav(page)).toHaveCount(0);
      // Browser / Android back.
      await page.goBack();
      await expect(visible(page).getByRole('button', { name: /راهنما و پشتیبانی/ })).toBeVisible();
      // Back on a non-home tab goes to orders, then «press again to exit».
      await page.goBack();
      await expect(nav(page).getByRole('button', { name: 'سفارش‌ها' })).toHaveAttribute(
        'aria-current',
        'page',
      );
      await page.goBack();
      await expect(page.getByRole('status')).toHaveText('برای خروج دوباره بزنید');
    });

    test('close asks first and shows the banner; open is immediate', async ({ page }) => {
      await open(page);
      const sw = page.getByRole('switch', { name: 'باز یا بسته بودن رستوران' });
      await expect(sw).toHaveAttribute('aria-checked', 'true');
      await sw.click();
      await page.getByRole('alertdialog').getByRole('button', { name: 'بستن رستوران' }).click();
      await expect(sw).toHaveAttribute('aria-checked', 'false');
      await expect(page.getByRole('status')).toHaveText('رستوران بسته شد');
      await expect(visible(page).getByText(/رستوران بسته است/)).toBeVisible();
      await visible(page).getByRole('button', { name: 'باز کردن رستوران' }).click();
      await expect(sw).toHaveAttribute('aria-checked', 'true');
      await expect(page.getByRole('alertdialog')).toHaveCount(0);
    });

    test('layout: bottom bar on phones, side rail + list/detail on tablets; no horizontal scroll', async ({
      page,
    }) => {
      await open(page);
      const box = (await nav(page).boundingBox())!;
      const detail = visible(page).getByRole('region', { name: 'جزئیات سفارش' });
      if (size.width >= 720) {
        expect(box.height).toBeGreaterThan(size.height * 0.9);
        expect(Math.round(box.width)).toBe(104);
        // RTL: the rail sits at the right edge.
        expect(Math.round(box.x + box.width)).toBe(size.width);
        await expect(detail).toBeVisible();
      } else {
        expect(Math.round(box.y + box.height)).toBe(size.height);
        await expect(detail).toBeHidden();
      }
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
}

test('touch targets are at least 48px', async ({ page }) => {
  await open(page);
  const small = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('button, [role="switch"], a')]
      .filter((el) => el.offsetParent !== null)
      .map((el) => ({
        t: el.textContent?.trim() || el.getAttribute('aria-label'),
        r: el.getBoundingClientRect(),
      }))
      .filter(({ r }) => r.height < 48 || r.width < 48)
      .map(({ t, r }) => `${t} ${Math.round(r.width)}×${Math.round(r.height)}`),
  );
  expect(small).toEqual([]);
});
