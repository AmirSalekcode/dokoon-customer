// k6 speed test for «invite»: logged-in user → hamburger menu → «دعوت از دوستان».
import { browser } from 'k6/browser';
import { openWithCart, goToMenuItem, pageOptions } from '../lib/page.js';

export const options = pageOptions();

export default async function () {
  const { context, page } = await openWithCart(browser);
  try {
    await goToMenuItem(page, 'دعوت از دوستان', 'invite', 'section h2');
  } finally {
    await page.close();
    await context.close();
  }
}
