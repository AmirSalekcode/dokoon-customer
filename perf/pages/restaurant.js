// k6 speed test for the «restaurant» screen (web vitals on load + in-app transition time).
import { browser } from 'k6/browser';
import { check } from 'k6';
import { NAV, navigate, openApp, pageOptions } from '../lib/page.js';

export const options = pageOptions();

export default async function () {
  const { context, page } = await openApp(browser);
  try {
    await navigate(page, 'div[role="button"][aria-label="کباب‌سرای نقش‌جهان"]', 'restaurant', 'h1');
  } finally {
    await page.close();
    await context.close();
  }
}
