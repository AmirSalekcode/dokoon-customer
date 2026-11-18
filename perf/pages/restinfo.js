// k6 speed test for the «restinfo» screen (restaurant → info: in-app transition time + web vitals).
import { browser } from 'k6/browser';
import { navigate, openApp, pageOptions } from '../lib/page.js';

export const options = pageOptions();

export default async function () {
  const { context, page } = await openApp(browser);
  try {
    await navigate(page, 'div[role="button"][aria-label="کباب‌سرای نقش‌جهان"]', 'restaurant', 'h1');
    await navigate(
      page,
      '//main[@data-screen="restaurant"]//button[normalize-space(.)="اطلاعات رستوران و ساعت کاری"]',
      'restinfo',
      'h1',
    );
  } finally {
    await page.close();
    await context.close();
  }
}
