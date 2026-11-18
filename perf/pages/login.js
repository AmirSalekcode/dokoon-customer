// k6 speed test for «login»: guest opens it from the account tab.
import { browser } from 'k6/browser';
import { goToLogin, openApp, pageOptions } from '../lib/page.js';

export const options = pageOptions();

export default async function () {
  const { context, page } = await openApp(browser);
  try {
    await goToLogin(page);
  } finally {
    await page.close();
    await context.close();
  }
}
