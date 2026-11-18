import { expect, test } from '@playwright/test';

test('mock service worker cannot register → 503 error page, never a blank screen', async ({ page }) => {
  // Same failure as seen in an embedded browser: registration rejects. (page.route cannot block the
  // browser's own service-worker script fetch, so we fail register() itself.)
  await page.addInitScript(() => {
    navigator.serviceWorker.register = () =>
      Promise.reject(new TypeError('Failed to register a ServiceWorker: An unknown error occurred'));
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'سرویس موقتاً در دسترس نیست' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'تلاش دوباره' })).toBeVisible();
});
