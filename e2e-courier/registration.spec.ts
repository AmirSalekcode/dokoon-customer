import { expect, test, type Page } from '@playwright/test';
import { signIn } from './helpers';

// KAN-91 (CP-07): courier registration — details, data-driven documents, Sheba, submit → waiting page;
// a 422 (national code already registered) opens the details step with the server message.
const top = (page: Page) => page.locator('main:not([hidden])');
const cta = (page: Page, name: string) => top(page).getByRole('button', { name, exact: true });
const pdf = (name: string) => ({
  name,
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4\n%%EOF\n'),
});
const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function toRegistration(page: Page) {
  await page.goto('/');
  await signIn(page, '09120000001');
  await expect(top(page)).toHaveAttribute('data-screen', 'reg');
}

async function details(page: Page, nid: string) {
  await top(page).getByLabel('نام و نام خانوادگی').fill('رضا احمدی');
  await top(page).getByLabel('کد ملی').fill(nid);
  await top(page).getByLabel('پلاک موتورسیکلت').fill('۱۲۳ ۴۵۶۷۸');
  await cta(page, 'ادامه').click();
}

async function documents(page: Page) {
  await expect(top(page).getByText('کارت ملی', { exact: true })).toBeVisible();
  for (const label of ['کارت ملی', 'گواهینامه موتور', 'کارت موتورسیکلت', 'بیمه‌نامه شخص ثالث']) {
    const tile = top(page).getByRole('button', { name: new RegExp(label) });
    const chooser = page.waitForEvent('filechooser');
    await tile.click();
    await (await chooser).setFiles(pdf(`${label}.pdf`));
    await expect(tile).toContainText('بارگذاری شد');
  }
  await cta(page, 'ادامه').click();
}

test('full registration: details → documents → Sheba → submitted → waiting page', async ({ page }) => {
  await toRegistration(page);
  await expect(top(page).getByRole('list', { name: 'مراحل ثبت‌نام' })).toBeVisible();
  await details(page, '0012345679');
  await documents(page);
  await top(page).getByLabel('شماره‌ی شبا (برای تسویه‌حساب)').fill('IR062960000000100324200001');
  await cta(page, 'ارسال برای بررسی').click();
  await expect(top(page).getByText('درخواست شما ثبت شد')).toBeVisible();
  await cta(page, 'مشاهده‌ی وضعیت ثبت‌نام').click();
  await expect(page.getByRole('heading', { name: 'حساب شما در انتظار تأیید است' })).toBeVisible();
  expect(await overflow(page)).toBeLessThanOrEqual(0);
});

test('422: a national code already registered returns to the details step with the message', async ({
  page,
}) => {
  await toRegistration(page);
  await details(page, '1234567891');
  await documents(page);
  await top(page).getByLabel('شماره‌ی شبا (برای تسویه‌حساب)').fill('IR062960000000100324200001');
  await cta(page, 'ارسال برای بررسی').click();
  await expect(top(page).getByText('این کد ملی برای پیک دیگری ثبت شده است')).toBeVisible();
  await expect(top(page).getByLabel('کد ملی')).toBeVisible();
  await expect(cta(page, 'ادامه')).toBeDisabled();
});

test('browser back walks the steps, then leaves to login', async ({ page }) => {
  await toRegistration(page);
  await details(page, '0012345679');
  await expect(top(page).getByText('کارت ملی', { exact: true })).toBeVisible();
  await page.goBack();
  await expect(top(page).getByLabel('نام و نام خانوادگی')).toHaveValue('رضا احمدی');
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'ورود به اپ پیک' })).toBeVisible();
});

test.describe('dark, tablet', () => {
  test.use({ colorScheme: 'dark', viewport: { width: 1024, height: 768 } });
  test('the wizard stays centred without horizontal scroll', async ({ page }) => {
    await toRegistration(page);
    await details(page, '0012345679');
    await expect(top(page).getByText('کارت ملی', { exact: true })).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
});
