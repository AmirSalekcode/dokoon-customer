// k6 speed test for «rateapp»: returning guest → hamburger menu → «امتیاز دادن به دکون».
import { browser } from 'k6/browser';
import { openApp, goToMenuItem, pageOptions } from '../lib/page.js';

export const options = pageOptions();

export default async function () {
  const { context, page } = await openApp(browser);
  try {
    await goToMenuItem(page, 'امتیاز دادن به دکون', 'rateapp', '[role="radiogroup"]');
  } finally {
    await page.close();
    await context.close();
  }
}
