// k6 speed test for «paid»: checkout → cash on delivery → «ثبت سفارش» (includes POST /orders).
import { browser } from 'k6/browser';
import { goToCheckout, navigate, openWithCart, pageOptions } from '../lib/page.js';

export const options = pageOptions();

export default async function () {
  const { context, page } = await openWithCart(browser, { withAddress: true });
  try {
    await goToCheckout(page);
    await page
      .locator(
        '//main[@data-screen="checkout"]//button[@role="radio"][.//*[normalize-space(.)="نقدی هنگام تحویل"]]',
      )
      .click();
    await navigate(
      page,
      '//main[@data-screen="checkout"]//button[starts-with(normalize-space(.), "ثبت سفارش")][not(@disabled)]',
      'paid',
      'h1',
    );
  } finally {
    await page.close();
    await context.close();
  }
}
