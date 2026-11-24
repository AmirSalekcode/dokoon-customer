import { expect, test, type Page } from '@playwright/test';
import { openCourier } from './helpers';

// KAN-101 (CP-17): my documents (renew an expiring one), support FAQ, cookie settings; exact back.
const top = (page: Page) => page.locator('main:not([hidden])');
const tab = (page: Page, name: string) =>
  page.getByRole('navigation', { name: 'بخش‌های پیک' }).getByRole('button', { name });
const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test('renew an expiring document: warning dot → upload → in review', async ({ page }) => {
  await openCourier(page);
  await tab(page, 'حساب').click();
  const row = top(page).getByRole('button', { name: /مدارک من/ });
  await expect(row).toContainText('یک مدرک نزدیک انقضاست');
  await row.click();
  await expect(top(page)).toHaveAttribute('data-screen', 'docs');
  const list = top(page).getByRole('list', { name: 'مدارک' });
  await expect(list.getByRole('listitem')).toHaveCount(5);
  await expect(list).toContainText('نزدیک انقضا');

  const chooser = page.waitForEvent('filechooser');
  await top(page).getByRole('button', { name: 'بارگذاری مجدد بیمه‌نامه شخص ثالث' }).click();
  await (
    await chooser
  ).setFiles({ name: 'ins.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(2000) });
  await expect(list).toContainText('در حال بررسی');
  await expect(top(page).getByRole('button', { name: 'بارگذاری مجدد بیمه‌نامه شخص ثالث' })).toHaveCount(0);
  expect(await overflow(page)).toBeLessThanOrEqual(0);

  await page.goBack();
  await expect(top(page)).toHaveAttribute('data-screen', 'account');
  await expect(row).not.toContainText('نزدیک انقضاست');
});

test('support FAQ and cookie settings saved; back returns to the account tab', async ({ page }) => {
  await openCourier(page);
  await tab(page, 'حساب').click();
  await top(page)
    .getByRole('button', { name: /پشتیبانی/ })
    .click();
  await expect(top(page)).toHaveAttribute('data-screen', 'support');
  await top(page).getByRole('button', { name: 'چرا موقعیتم ثبت می‌شود؟' }).click();
  await expect(top(page)).toContainText('با آفلاین شدن متوقف می‌شود');
  await page.goBack();

  await top(page)
    .getByRole('button', { name: /کوکی‌ها و حریم خصوصی/ })
    .click();
  await expect(top(page)).toHaveAttribute('data-screen', 'cookies');
  await top(page)
    .getByRole('switch', { name: /عملکرد و خطاها/ })
    .click();
  await top(page).getByRole('button', { name: 'ذخیره‌ی انتخاب' }).click();
  await expect(top(page)).toHaveAttribute('data-screen', 'account');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('dkc-consent') ?? '{}'));
  expect(saved).toMatchObject({ performance: true, synced: true });
});

test.describe('dark, tablet 1024', () => {
  test.use({ viewport: { width: 1024, height: 768 }, colorScheme: 'dark' });
  test('documents and support stay centred without horizontal scroll', async ({ page }) => {
    await openCourier(page);
    await tab(page, 'حساب').click();
    await top(page)
      .getByRole('button', { name: /مدارک من/ })
      .click();
    await expect(top(page).getByRole('list', { name: 'مدارک' }).getByRole('listitem')).toHaveCount(5);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await page.goBack();
    await top(page)
      .getByRole('button', { name: /پشتیبانی/ })
      .click();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
});
