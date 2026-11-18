// k6 speed test for «legal»: account tab → «درباره ما و قوانین» → «حریم خصوصی» (sections loaded).
import { browser } from 'k6/browser';
import { goToAccountItem, navigate, openApp, pageOptions } from '../lib/page.js';

export const options = pageOptions();

export default async function () {
  const { context, page } = await openApp(browser);
  try {
    await goToAccountItem(page, 'درباره ما و قوانین', 'about');
    await navigate(
      page,
      '//main[@data-screen="about"]//button[.//*[normalize-space(.)="حریم خصوصی"]]',
      'legal',
      'button[aria-expanded]',
    );
  } finally {
    await page.close();
    await context.close();
  }
}
