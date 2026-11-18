// k6 speed test for «favs»: logged-in user → account → «علاقه‌مندی‌ها».
import { browser } from 'k6/browser';
import { goToAccountItem, openWithCart, pageOptions } from '../lib/page.js';

export const options = pageOptions();

export default async function () {
  const { context, page } = await openWithCart(browser, { withAddress: true });
  try {
    await goToAccountItem(page, 'علاقه‌مندی‌ها', 'favs');
  } finally {
    await page.close();
    await context.close();
  }
}
