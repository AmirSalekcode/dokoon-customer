// k6 speed test for «city»: skip onboarding → city list loaded from the API.
import { browser } from 'k6/browser';
import { openFresh, navigate, pageOptions } from '../lib/page.js';

export const options = pageOptions();

export default async function () {
  const { context, page } = await openFresh(browser, 'onboard', 'h1');
  try {
    await navigate(
      page,
      '//main[@data-screen="onboard"]//button[normalize-space(.)="رد کردن"]',
      'city',
      '[role="radio"]',
    );
  } finally {
    await page.close();
    await context.close();
  }
}
