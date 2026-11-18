// k6 speed test for «cancel»: track (just placed) → «لغو سفارش».
import { browser } from 'k6/browser';
import { goToTrack, navigate, openWithCart, pageOptions, trackButton } from '../lib/page.js';

export const options = pageOptions();

export default async function () {
  const { context, page } = await openWithCart(browser, { withAddress: true });
  try {
    await goToTrack(page);
    await navigate(page, trackButton('لغو سفارش'), 'cancel', 'h2');
  } finally {
    await page.close();
    await context.close();
  }
}
