import { createRequire } from 'node:module';
import { expect, test, type Page } from '@playwright/test';
import { allowDevice, dismissCookies, openCourier } from './helpers';

// KAN-102 (CP-18): accessibility review (axe-core, WCAG 2.1 A/AA) of every courier screen on the phone
// and at tablet width, and the offline page from each of them (back on the same screen when online again).
const require = createRequire(import.meta.url);
const AXE = require.resolve('axe-core/axe.min.js');

const top = (page: Page) => page.locator('main:not([hidden])');
const tab = (page: Page, name: string) =>
  page.getByRole('navigation', { name: 'بخش‌های پیک' }).getByRole('button', { name });
const accountRow = (page: Page, name: RegExp) => top(page).getByRole('button', { name });

interface AxeViolation {
  id: string;
  impact: string | null;
  help: string;
  nodes: { target: string[]; html: string; any: { message: string }[] }[];
}

/** WCAG 2.1 A/AA violations on the visible page (hidden lower stack screens are excluded by axe). */
async function axe(page: Page, where: string) {
  await page.addScriptTag({ path: AXE });
  const violations = await page.evaluate(async () => {
    const r = await (
      window as unknown as { axe: { run: (c: unknown, o: unknown) => Promise<{ violations: unknown[] }> } }
    ).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
    return r.violations;
  });
  const list = (violations as AxeViolation[]).map(
    (v) =>
      `${where}: ${v.id} (${v.impact}) ${v.help} → ${v.nodes.map((n) => `${n.html.slice(0, 80)} ${n.any[0]?.message ?? ''}`).join(' | ')}`,
  );
  expect(list, list.join('\n')).toEqual([]);
}

async function goOnlineWithOffers(page: Page) {
  await top(page).getByRole('switch').click();
  await expect(top(page).getByRole('button', { name: /کیلومتر/ })).toHaveCount(3);
}

for (const vp of [
  { name: 'phone', viewport: { width: 390, height: 844 } },
  { name: 'tablet', viewport: { width: 1024, height: 768 } },
  { name: 'phone dark', viewport: { width: 390, height: 844 }, colorScheme: 'dark' as const },
]) {
  test.describe(`axe ${vp.name}`, () => {
    test.use({ viewport: vp.viewport, colorScheme: 'colorScheme' in vp ? vp.colorScheme : 'light' });

    test('login and the cookie card', async ({ page }) => {
      await allowDevice(page);
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'ورود به اپ پیک' })).toBeVisible();
      await axe(page, 'login');
      await dismissCookies(page);
    });

    test('orders, offer alert, order steps and the reason sheet', async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem('dkc-mock-offer-ms', '0'));
      await openCourier(page);
      await axe(page, 'orders offline');
      await goOnlineWithOffers(page);
      await axe(page, 'orders online');
      await top(page)
        .getByRole('button', { name: /کیلومتر/ })
        .first()
        .click();
      await expect(page.getByRole('alertdialog', { name: 'سفارش جدید برای شما' })).toBeVisible();
      await axe(page, 'offer alert');
      await page.getByRole('alertdialog').getByRole('button', { name: 'قبول سفارش' }).click();
      await expect(top(page)).toHaveAttribute('data-screen', 'order');
      await axe(page, 'order to restaurant');
      await top(page).getByRole('button', { name: 'انصراف از سفارش' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await axe(page, 'withdraw sheet');
      await page.getByRole('button', { name: 'بستن' }).click();
      await top(page).getByRole('button', { name: 'به رستوران رسیدم' }).click();
      await expect(top(page).getByRole('checkbox').first()).toBeVisible();
      await axe(page, 'order pickup');
    });

    test('earnings, history, details and settlements', async ({ page }) => {
      await openCourier(page);
      await tab(page, 'درآمد').click();
      await expect(top(page).getByText('۴۸۰٬۰۰۰ تومان')).toBeVisible();
      await axe(page, 'earnings');
      await top(page)
        .getByRole('button', { name: /تاریخچه‌ی سفارش‌ها/ })
        .click();
      await expect(top(page).getByRole('listitem').first()).toBeVisible();
      await axe(page, 'history');
      await top(page).getByRole('listitem').first().getByRole('button').click();
      await axe(page, 'trip details');
      await page.goBack();
      await page.goBack();
      await top(page)
        .getByRole('button', { name: /تسویه‌حساب‌ها/ })
        .click();
      await expect(top(page).getByText('۲٬۱۴۰٬۰۰۰ تومان')).toBeVisible();
      await axe(page, 'settlements');
    });

    test('account and its pages', async ({ page }) => {
      await openCourier(page);
      await tab(page, 'حساب').click();
      await expect(top(page).getByRole('region', { name: 'کارت پیک' })).toContainText('مهدی کریمی');
      await axe(page, 'account');
      for (const [row, where, ready] of [
        [/اطلاعات من/, 'my info', 'پلاک موتور'],
        [/مدارک من/, 'documents', 'نزدیک انقضا'],
        [/پشتیبانی/, 'support', 'پرسش‌های پرتکرار'],
        [/کوکی‌ها و حریم خصوصی/, 'cookies', 'آمار استفاده'],
        [/مجوزهای دستگاه/, 'permissions', 'موقعیت مکانی'],
      ] as const) {
        await accountRow(page, row).click();
        await expect(top(page)).toContainText(ready);
        await axe(page, where);
        await page.goBack();
        await expect(top(page)).toHaveAttribute('data-screen', 'account');
      }
    });
  });
}

test('offline from any screen shows the offline page; online again returns to that screen', async ({
  page,
  context,
}) => {
  await openCourier(page);
  const stops: { open: () => Promise<void>; screen: string }[] = [
    { open: async () => tab(page, 'سفارش‌ها').click(), screen: 'orders' },
    { open: async () => tab(page, 'درآمد').click(), screen: 'earn' },
    {
      open: async () => {
        await tab(page, 'درآمد').click();
        await top(page)
          .getByRole('button', { name: /تاریخچه‌ی سفارش‌ها/ })
          .click();
      },
      screen: 'hist',
    },
    {
      open: async () => {
        await page.goBack();
        await tab(page, 'حساب').click();
      },
      screen: 'account',
    },
    {
      open: async () => {
        await tab(page, 'حساب').click();
        await accountRow(page, /مدارک من/).click();
      },
      screen: 'docs',
    },
  ];
  for (const s of stops) {
    await s.open();
    await expect(top(page)).toHaveAttribute('data-screen', s.screen);
    await context.setOffline(true);
    await expect(page.getByRole('heading', { name: 'اینترنت متصل نیست' })).toBeVisible();
    await axe(page, `offline over ${s.screen}`);
    await context.setOffline(false);
    await expect(top(page)).toHaveAttribute('data-screen', s.screen);
  }
});
