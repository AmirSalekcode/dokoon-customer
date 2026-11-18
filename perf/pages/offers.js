// k6 speed test for «offers»: home → offers tab (guest, D-59) → codes, discounted restaurants, campaigns.
import { browser } from 'k6/browser';
import { NAV, navigate, openApp, pageOptions } from '../lib/page.js';

export const options = pageOptions();

export default async function () {
  const { context, page } = await openApp(browser);
  try {
    await navigate(page, NAV.offers, 'offers', '#of-camps');
  } finally {
    await page.close();
    await context.close();
  }
}
