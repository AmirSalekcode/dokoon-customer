// k6 speed test for «checkout»: cart → checkout as a logged-in user with a saved address.
import { browser } from 'k6/browser';
import { goToCheckout, openWithCart, pageOptions } from '../lib/page.js';

export const options = pageOptions();

export default async function () {
  const { context, page } = await openWithCart(browser, { withAddress: true });
  try {
    await goToCheckout(page);
  } finally {
    await page.close();
    await context.close();
  }
}
