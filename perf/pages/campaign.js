// k6 speed test for «campaign»: home → offers tab → a campaign → banner and participating restaurants.
import { browser } from 'k6/browser';
import { NAV, inScreen, navigate, openApp, pageOptions } from '../lib/page.js';

export const options = pageOptions();

export default async function () {
  const { context, page } = await openApp(browser);
  try {
    await navigate(page, NAV.offers, 'offers', '#of-camps');
    await navigate(
      page,
      inScreen('offers', 'section[aria-labelledby="of-camps"] button'),
      'campaign',
      '#cp-rests',
    );
  } finally {
    await page.close();
    await context.close();
  }
}
