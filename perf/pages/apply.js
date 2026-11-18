// k6 speed test for «apply»: returning guest → hamburger menu → «ثبت‌نام رستوران» (form ready).
import { browser } from 'k6/browser';
import { goToMenuItem, openApp, pageOptions } from '../lib/page.js';

export const options = pageOptions();

export default async function () {
  const { context, page } = await openApp(browser);
  try {
    await goToMenuItem(page, 'ثبت‌نام رستوران', 'apply', 'h1');
  } finally {
    await page.close();
    await context.close();
  }
}
