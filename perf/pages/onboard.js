// k6 speed test for «onboard»: reached automatically after the splash; slide change is measured.
import { browser } from 'k6/browser';
import { openFresh, navigate, pageOptions } from '../lib/page.js';

export const options = pageOptions();

export default async function () {
  // Splash lasts 1.8s by spec; the slide change after it is the interaction we budget.
  const { context, page } = await openFresh(browser, 'onboard', 'h1');
  try {
    await navigate(
      page,
      '//main[@data-screen="onboard"]//button[normalize-space(.)="بعدی"]',
      'onboard',
      'h1',
    );
  } finally {
    await page.close();
    await context.close();
  }
}
