// k6 speed test for «addaddr»: checkout without an address → «افزودن آدرس» → map + form.
import { browser } from 'k6/browser';
import { goToCheckout, navigate, openWithCart, pageOptions } from '../lib/page.js';

export const options = pageOptions();

export default async function () {
  const { context, page } = await openWithCart(browser);
  try {
    await goToCheckout(page);
    await navigate(
      page,
      '//main[@data-screen="checkout"]//button[normalize-space(.)="افزودن آدرس"]',
      'addaddr',
      'h2',
    );
  } finally {
    await page.close();
    await context.close();
  }
}
