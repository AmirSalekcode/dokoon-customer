// k6 speed test for the «settings» screen (web vitals on load + in-app transition time).
import { browser } from 'k6/browser';
import { check } from 'k6';
import { NAV, navigate, openApp, pageOptions } from '../lib/page.js';

export const options = pageOptions();

export default async function () {
  const { context, page } = await openApp(browser);
  try {
    await navigate(page, NAV.account, 'account', 'h2');
    await navigate(page, '//main[@data-screen="account"]//button[contains(., "تنظیمات")]', 'settings', 'h2');
  } finally {
    await page.close();
    await context.close();
  }
}
