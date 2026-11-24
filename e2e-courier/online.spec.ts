import { expect, test, type Page } from '@playwright/test';
import { openCourier } from './helpers';

// KAN-93 (CP-09): online / offline switch with `PUT /c/status`, and location reports (`POST /c/location`)
// only while online.
const top = (page: Page) => page.locator('main:not([hidden])');
const sw = (page: Page) => top(page).getByRole('switch');
const track = (page: Page) => top(page).getByRole('status');

function countLocations(page: Page) {
  const seen: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && new URL(r.url()).pathname.endsWith('/c/location')) seen.push(r.url());
  });
  return seen;
}

test('offline → online → offline: the switch, the tracking line and location reports follow', async ({
  page,
}) => {
  const locations = countLocations(page);
  await openCourier(page);
  await expect(sw(page)).toHaveAttribute('aria-checked', 'false');
  await expect(track(page)).toContainText('ردیابی خاموش');
  expect((await sw(page).boundingBox())!.height).toBeGreaterThanOrEqual(56);

  await sw(page).click();
  await expect(sw(page)).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByText('آنلاین شدید')).toBeVisible();
  await expect(track(page)).toContainText('ردیابی فعال');
  await expect.poll(() => locations.length).toBeGreaterThanOrEqual(1);
  // (The body is checked in the unit test: requests answered by the mock service worker carry no postData here.)
  await expect(track(page)).not.toContainText('در حال یافتن');

  await sw(page).click();
  await expect(sw(page)).toHaveAttribute('aria-checked', 'false');
  await expect(track(page)).toContainText('ردیابی خاموش');
  const after = locations.length;
  // A new position while offline is never reported.
  await page.context().setGeolocation({ latitude: 32.02, longitude: 51.87 });
  await page.waitForTimeout(1500);
  expect(locations.length).toBe(after);
});

test('dark theme and no horizontal scroll on the orders tab', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('dk-theme', 'dark'));
  await openCourier(page);
  await sw(page).click();
  await expect(sw(page)).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
  ).toBeLessThanOrEqual(0);
});
