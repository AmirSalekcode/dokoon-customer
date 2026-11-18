// k6 speed test for «social»: returning guest → hamburger menu → «شبکه‌های اجتماعی».
import { browser } from 'k6/browser';
import { openApp, goToMenuItem, pageOptions } from '../lib/page.js';

export const options = pageOptions();

export default async function () {
  const { context, page } = await openApp(browser);
  try {
    await goToMenuItem(page, 'شبکه‌های اجتماعی', 'social', 'button[aria-label^="دنبال کردن"]');
  } finally {
    await page.close();
    await context.close();
  }
}
