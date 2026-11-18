// k6 speed test for «payfail»: gateway → «پرداخت ناموفق» (server-verified result) → payfail.
import { browser } from 'k6/browser';
import { goToGateway, navigate, openWithCart, pageOptions } from '../lib/page.js';

export const options = pageOptions();

export default async function () {
  const { context, page } = await openWithCart(browser, { withAddress: true });
  try {
    await goToGateway(page);
    await navigate(
      page,
      '//main[@data-screen="gateway"]//button[normalize-space(.)="پرداخت ناموفق"]',
      'payfail',
      'h1',
    );
  } finally {
    await page.close();
    await context.close();
  }
}
