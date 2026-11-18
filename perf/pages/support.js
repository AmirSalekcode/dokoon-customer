// k6 speed test for «support»: returning guest → hamburger menu → «پشتیبانی و پرسش‌های متداول».
import { browser } from 'k6/browser';
import { openApp, goToMenuItem, pageOptions } from '../lib/page.js';

export const options = pageOptions();

export default async function () {
  const { context, page } = await openApp(browser);
  try {
    await goToMenuItem(page, 'پشتیبانی و پرسش‌های متداول', 'support', 'a[href^="tel:"]');
  } finally {
    await page.close();
    await context.close();
  }
}
