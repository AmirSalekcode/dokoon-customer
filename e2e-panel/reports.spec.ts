import { expect, test, type Page } from '@playwright/test';
import { openPanel, seedSession } from './helpers';

// KAN-68: reports tab and settlement detail (server numbers only), phone and tablet.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('dk-mock-neworder-ms', '0'));
  await seedSession(page);
});

const visible = (page: Page) => page.locator('main:not([hidden])');
const nav = (page: Page) => page.getByRole('navigation', { name: 'بخش‌های رستوران' });

async function openReports(page: Page) {
  await openPanel(page);
  await nav(page).getByRole('button', { name: 'گزارش' }).click();
  await expect(visible(page).getByText('۴٬۸۵۰٬۰۰۰ تومان')).toBeVisible();
}

test('periods switch the report; a settlement opens its detail and the invoice downloads', async ({
  page,
}) => {
  await openReports(page);
  await visible(page).getByRole('tab', { name: 'این هفته' }).click();
  await expect(visible(page).getByText('۳۱٬۲۰۰٬۰۰۰ تومان')).toBeVisible();
  await expect(visible(page).getByRole('img', { name: /سفارش‌ها در روزهای این هفته/ })).toBeVisible();

  await visible(page)
    .getByRole('button', { name: /هفته‌ی ۴ آبان/ })
    .click();
  await expect(visible(page)).toHaveAttribute('data-screen', 'settle');
  await expect(visible(page).getByText('کمیسیون دکون (۱۲٪)')).toBeVisible();
  await expect(visible(page).getByText('۳۴٬۳۲۰٬۰۰۰ تومان')).toBeVisible();
  await expect(nav(page)).toHaveCount(0);

  const download = page.waitForEvent('download');
  await visible(page).getByRole('button', { name: 'دریافت صورت‌حساب' }).click();
  expect((await download).suggestedFilename()).toBe('dokoon-invoice-s2.pdf');

  await page.goBack();
  await expect(visible(page)).toHaveAttribute('data-screen', 'reports');
  // The chosen period is kept when coming back.
  await expect(visible(page).getByRole('tab', { name: 'این هفته' })).toHaveAttribute('aria-selected', 'true');
});

test.describe('tablet 1024', () => {
  test.use({ viewport: { width: 1024, height: 768 } });
  test('report and settlements fit without horizontal scroll', async ({ page }) => {
    await openReports(page);
    await expect(visible(page).getByRole('heading', { name: 'تسویه‌حساب‌ها' })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
