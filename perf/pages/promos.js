// k6 speed test for «promos»: logged-in user → account → «کدهای تخفیف».
import { browser } from 'k6/browser';
import { goToAccountItem, openWithCart, pageOptions } from '../lib/page.js';

export const options = pageOptions();

export default async function () {
  const { context, page } = await openWithCart(browser, { withAddress: true });
  try {
    await goToAccountItem(page, 'کدهای تخفیف', 'promos');
  } finally {
    await page.close();
    await context.close();
  }
}
