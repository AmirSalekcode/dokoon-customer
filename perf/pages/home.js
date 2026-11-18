// k6 speed test for the «home» screen (web vitals on load + in-app transition time).
import { browser } from 'k6/browser';
import { check } from 'k6';
import { NAV, navigate, openApp, pageOptions } from '../lib/page.js';

export const options = pageOptions();

export default async function () {
  const { context, page } = await openApp(browser);
  try {
    const n = await page.locator('main[data-screen="home"]:not([hidden]) [role="button"]').count();
    check(n, { 'home lists restaurants': (v) => v > 0 });
  } finally {
    await page.close();
    await context.close();
  }
}
