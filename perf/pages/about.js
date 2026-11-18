// k6 speed test for «about»: account tab → «درباره ما و قوانین».
import { browser } from 'k6/browser';
import { goToAccountItem, openApp, pageOptions } from '../lib/page.js';

export const options = pageOptions();

export default async function () {
  const { context, page } = await openApp(browser);
  try {
    await goToAccountItem(page, 'درباره ما و قوانین', 'about');
  } finally {
    await page.close();
    await context.close();
  }
}
