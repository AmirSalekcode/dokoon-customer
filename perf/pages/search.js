// k6 speed test for «search»: home → tap the search bar (guest, D-59) → type a query → results.
import { browser } from 'k6/browser';
import { inScreen, navigate, openApp, pageOptions } from '../lib/page.js';

export const options = pageOptions();

export default async function () {
  const { context, page } = await openApp(browser);
  try {
    await navigate(
      page,
      '//main[@data-screen="home"]//button[normalize-space(.)="دنبال چه رستوران یا غذایی؟"]',
      'search',
      'h1',
    );
    await page.locator(inScreen('search', 'input[type="search"]')).fill('برگر');
    await page.locator(inScreen('search', '#sr-rests')).waitFor({ state: 'visible' });
  } finally {
    await page.close();
    await context.close();
  }
}
