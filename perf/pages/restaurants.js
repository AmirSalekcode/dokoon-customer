// k6 speed test for «restaurants»: home → restaurants tab (guest, D-59) → list → pick a category.
import { browser } from 'k6/browser';
import { NAV, inScreen, navigate, openApp, pageOptions, transition } from '../lib/page.js';

export const options = pageOptions();

export default async function () {
  const { context, page } = await openApp(browser);
  try {
    await navigate(page, NAV.restaurants, 'restaurants', 'section[aria-label="لیست رستوران‌ها"]');
    await transition(
      page,
      () =>
        page.locator(inScreen('restaurants', 'nav[aria-label="دسته‌بندی‌ها"] button:nth-child(2)')).click(),
      'restaurants',
      'section[aria-label="لیست رستوران‌ها"] [role="button"]',
    );
  } finally {
    await page.close();
    await context.close();
  }
}
