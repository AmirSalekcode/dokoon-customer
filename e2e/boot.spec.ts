import { expect, test } from '@playwright/test';

test('mock service worker cannot register → in-page mocks keep the demo working', async ({ page }) => {
  // Same failure as in an embedded browser / Android WebView: registration rejects. (page.route
  // cannot block the browser's own service-worker script fetch, so we fail register() itself.)
  await page.addInitScript(() => {
    navigator.serviceWorker.register = () =>
      Promise.reject(new TypeError('Failed to register a ServiceWorker: An unknown error occurred'));
    localStorage.setItem(
      'dk-consent',
      JSON.stringify({ version: 1, analytics: false, decidedAt: '2026-11-18' }),
    );
    localStorage.setItem('dk-launch', JSON.stringify({ seenOnboarding: true, cityId: 'shahreza' }));
  });
  await page.goto('/');
  await expect(page.locator('main:not([hidden])').getByRole('heading', { name: 'نزدیک شما' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'سرویس موقتاً در دسترس نیست' })).toHaveCount(0);
});
