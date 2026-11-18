// k6 speed test for «rateorder»: delivered order (mock steps shortened) → track → «امتیاز به سفارش».
import { browser } from 'k6/browser';
import { goToTrack, navigate, openWithCart, pageOptions, trackButton } from '../lib/page.js';

export const options = pageOptions();

export default async function () {
  const { context, page } = await openWithCart(browser, { withAddress: true, stepMs: 1 });
  try {
    await goToTrack(page);
    await navigate(page, trackButton('امتیاز به سفارش'), 'rateorder', 'h2');
  } finally {
    await page.close();
    await context.close();
  }
}
