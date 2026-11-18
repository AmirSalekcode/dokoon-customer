// k6 speed test for «soon»: account → settings → dev preview chip «soon» (mock build only).
import { browser } from 'k6/browser';
import { NAV, navigate, openApp, pageOptions } from '../lib/page.js';

export const options = pageOptions();

export default async function () {
  const { context, page } = await openApp(browser);
  try {
    await navigate(page, NAV.account, 'account', 'h2');
    await navigate(page, '//main[@data-screen="account"]//button[contains(., "تنظیمات")]', 'settings', 'h2');
    await navigate(page, '//main[@data-screen="settings"]//button[normalize-space(.)="soon"]', 'soon', 'h4');
  } finally {
    await page.close();
    await context.close();
  }
}
