// k6 speed test for «gateway»: checkout → online payment → gateway (includes POST /orders).
import { browser } from 'k6/browser';
import { goToGateway, openWithCart, pageOptions } from '../lib/page.js';

export const options = pageOptions();

export default async function () {
  const { context, page } = await openWithCart(browser, { withAddress: true });
  try {
    await goToGateway(page);
  } finally {
    await page.close();
    await context.close();
  }
}
