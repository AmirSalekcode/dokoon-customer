import { expect, test, type Page } from '@playwright/test';

// KAN-60: registration wizard — info + map pin, data-driven documents (real file chooser + upload),
// Sheba checksum, submit → status page; and «needs more documents».
const visible = (page: Page) => page.locator('main:not([hidden])');
const PDF = { name: 'license.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 demo') };
// 1×1 PNG
const PNG = {
  name: 'id.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  ),
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('dk-mock-neworder-ms', '0'));
});

async function signIn(page: Page, phone: string) {
  await page.goto('/');
  await page.getByLabel('شماره‌ی موبایل مدیر رستوران').fill(phone);
  await page.getByRole('button', { name: 'دریافت کد تأیید' }).click();
  await page.getByLabel('کد ۴ رقمی').fill('1234');
}

async function upload(page: Page, tile: RegExp, file: typeof PDF) {
  const chooser = page.waitForEvent('filechooser');
  await visible(page).getByRole('button', { name: tile }).click();
  await (await chooser).setFiles(file);
  await expect(
    visible(page).getByRole('button', { name: new RegExp(`${tile.source}، بارگذاری شد`) }),
  ).toBeVisible();
}

test('new restaurant: info → documents → Sheba → submitted → status page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'رستوران جدید هستم، ثبت‌نام می‌کنم' }).click();
  await visible(page).getByLabel('شماره‌ی موبایل مدیر رستوران').fill('09130000000');
  await visible(page).getByRole('button', { name: 'دریافت کد تأیید' }).click();
  await visible(page).getByLabel('کد ۴ رقمی').fill('1234');

  await expect(page.getByRole('list', { name: 'مراحل ثبت‌نام' })).toBeVisible();
  const next = visible(page).getByRole('button', { name: 'ادامه' });
  await expect(next).toBeDisabled();
  await visible(page).getByLabel('نام رستوران').fill('کبابی تازه');
  await visible(page).getByLabel('آدرس رستوران').fill('شهرضا، خیابان امام، پلاک ۱۲');
  await visible(page)
    .getByRole('application', { name: 'نقشه برای انتخاب محل رستوران' })
    .click({ position: { x: 120, y: 90 } });
  await expect(page.getByText(/محل رستوران ثبت شد/)).toBeVisible();
  await next.click();

  await upload(page, /مجوز کسب/, PDF);
  await expect(visible(page).getByRole('button', { name: 'ادامه' })).toBeDisabled();
  await upload(page, /کارت ملی مدیر/, PNG);
  await visible(page).getByRole('button', { name: 'ادامه' }).click();

  const sheba = visible(page).getByLabel('شماره‌ی شبا (برای تسویه‌حساب)');
  await sheba.fill('IR062960000000100324200002');
  await expect(page.getByText(/شماره‌ی شبا درست نیست/)).toBeVisible();
  await sheba.fill('IR820540102680020817909002');
  await visible(page).getByRole('button', { name: 'ارسال برای بررسی' }).click();
  await expect(visible(page).getByRole('heading', { name: 'درخواست شما ثبت شد' })).toBeVisible();
  await visible(page).getByRole('button', { name: 'مشاهده‌ی وضعیت ثبت‌نام' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'درخواست شما در حال بررسی است' })).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('back steps through the wizard', async ({ page }) => {
  await signIn(page, '09130000000');
  await visible(page).getByLabel('نام رستوران').fill('کبابی تازه');
  await visible(page).getByLabel('آدرس رستوران').fill('شهرضا، خیابان امام، پلاک ۱۲');
  await visible(page)
    .getByRole('application')
    .click({ position: { x: 120, y: 90 } });
  await visible(page).getByRole('button', { name: 'ادامه' }).click();
  await expect(visible(page).getByRole('button', { name: /مجوز کسب/ })).toBeVisible();
  await page.goBack();
  await expect(visible(page).getByLabel('نام رستوران')).toHaveValue('کبابی تازه');
});

test('needs more documents: upload the asked one → back in review', async ({ page }) => {
  await signIn(page, '09130000002');
  await page.getByRole('button', { name: 'بارگذاری مدارک' }).click();
  await upload(page, /مجوز کسب/, PDF);
  await visible(page).getByRole('button', { name: 'ارسال برای بررسی' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'درخواست شما در حال بررسی است' })).toBeVisible();
});

test.describe('tablet', () => {
  test.use({ viewport: { width: 1024, height: 768 } });
  test('wizard fits without horizontal scroll', async ({ page }) => {
    await signIn(page, '09130000000');
    await expect(page.getByRole('list', { name: 'مراحل ثبت‌نام' })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
