// k6 speed test for «editprof»: logged-in user → account → «ویرایش پروفایل».
import { browser } from 'k6/browser';
import { goToAccountItem, openWithCart, pageOptions } from '../lib/page.js';

export const options = pageOptions();

export default async function () {
  const { context, page } = await openWithCart(browser, { withAddress: true });
  try {
    await goToAccountItem(page, 'ویرایش پروفایل', 'editprof');
  } finally {
    await page.close();
    await context.close();
  }
}
