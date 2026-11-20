import { expect, test, type Page } from '@playwright/test';
import { openPanel, seedSession } from './helpers';

// KAN-65: order detail — full cycle new → prep → ready → way, tablet side panel, receipt print (80 mm / A4).
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('dk-mock-neworder-ms', '0');
    // The print dialog cannot be driven; record the call instead.
    (window as unknown as { __printed: number }).__printed = 0;
    window.print = () => {
      (window as unknown as { __printed: number }).__printed += 1;
    };
  });
  await seedSession(page);
});

const tab = (page: Page, name: string) => page.getByRole('tab', { name, exact: true });

test('phone: full cycle from the order screen, back returns to the list', async ({ page }) => {
  await openPanel(page);
  await page
    .getByRole('button', { name: /^جزئیات سفارش/ })
    .first()
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'جزئیات سفارش' })).toBeVisible();
  const d = page.getByTestId('order-detail').locator('visible=true');
  await expect(d.getByText(/•••/)).toBeVisible();
  await expect(d.getByRole('button', { name: /تماس/ })).toHaveCount(0);

  await d.getByRole('button', { name: 'پذیرش سفارش' }).click();
  const sheet = page.getByRole('dialog', { name: 'زمان آماده‌سازی' });
  await sheet.getByRole('button', { name: /^۱۵/ }).click();
  await sheet.getByRole('button', { name: 'تأیید و پذیرش سفارش' }).click();
  await expect(d.getByText('زمان آماده‌سازی: ۱۵ دقیقه')).toBeVisible();
  await d.getByRole('button', { name: 'افزودن ۵ دقیقه به زمان آماده‌سازی' }).click();
  await expect(d.getByText('زمان آماده‌سازی: ۲۰ دقیقه')).toBeVisible();

  await d.getByRole('button', { name: 'سفارش آماده است' }).click();
  await expect(d.getByText('آماده تحویل به پیک')).toBeVisible();
  await d.getByRole('button', { name: 'تحویل به پیک شد' }).click();
  await expect(d.getByText('در مسیر مشتری', { exact: true }).first()).toBeVisible();
  await expect(d.getByRole('button', { name: 'تحویل به پیک شد' })).toHaveCount(0);

  await page.getByRole('button', { name: 'بازگشت' }).click();
  await expect(page.locator('main:not([hidden])')).toHaveAttribute('data-screen', 'orders');
  await expect(tab(page, 'جدید ۱')).toBeVisible();
  await expect(tab(page, 'آماده / در مسیر ۳')).toBeVisible();
});

test('tablet: the detail sits next to the list', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await openPanel(page);
  await tab(page, 'در حال آماده‌سازی ۱').click();
  await page
    .getByRole('button', { name: /^جزئیات سفارش/ })
    .first()
    .click();
  const side = page.getByRole('region', { name: 'جزئیات سفارش' });
  await expect(side.getByTestId('order-detail')).toBeVisible();
  await expect(page.locator('main:not([hidden])')).toHaveAttribute('data-screen', 'orders');
  await side.getByRole('button', { name: 'سفارش آماده است' }).click();
  await expect(side.getByText('آماده تحویل به پیک')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

/** Width of the first PDF page in points (1 mm = 2.835 pt). */
function pdfPageWidth(pdf: Buffer): number {
  const m = /\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/.exec(pdf.toString('latin1'));
  return m ? Number(m[1]) : 0;
}

for (const [paper, label, widthPt] of [
  ['80mm', '۸۰ میلی‌متر', 80 * 2.835],
  ['a4', 'آ۴', 210 * 2.835],
] as const) {
  test(`receipt prints on ${paper} paper`, async ({ page }) => {
    await openPanel(page);
    await page
      .getByRole('button', { name: /^جزئیات سفارش/ })
      .first()
      .click();
    const d = page.getByTestId('order-detail').locator('visible=true');
    await d.getByRole('button', { name: label }).click();
    await d.getByRole('button', { name: 'چاپ رسید' }).click();
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __printed: number }).__printed))
      .toBe(1);

    await page.emulateMedia({ media: 'print' });
    const receipt = page.getByTestId('receipt');
    await expect(receipt).toBeVisible();
    await expect(receipt).toContainText('کبابی سنتی زاگرس');
    await expect(receipt).toContainText('تومان');
    await expect(page.locator('#root')).toBeHidden();

    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: false });
    expect(pdf.byteLength).toBeGreaterThan(1000);
    expect(Math.abs(pdfPageWidth(pdf) - widthPt)).toBeLessThan(2);
  });
}
