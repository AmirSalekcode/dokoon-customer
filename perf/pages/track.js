// k6 speed test for «track»: cash order → paid → «پیگیری سفارش».
import { browser } from 'k6/browser';
import { goToTrack, openWithCart, pageOptions } from '../lib/page.js';

export const options = pageOptions();

export default async function () {
  const { context, page } = await openWithCart(browser, { withAddress: true });
  try {
    await goToTrack(page);
  } finally {
    await page.close();
    await context.close();
  }
}
