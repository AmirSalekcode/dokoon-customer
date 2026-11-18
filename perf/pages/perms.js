// k6 speed test for «perms»: profile saved (PATCH /me) → permissions screen.
import { browser } from 'k6/browser';
import { goToLogin, goToOtp, inScreen, navigate, openApp, pageOptions, transition } from '../lib/page.js';

export const options = pageOptions();

export default async function () {
  const { context, page } = await openApp(browser);
  try {
    await goToLogin(page);
    await goToOtp(page, '09120000001');
    await transition(page, () => page.locator(inScreen('otp', 'input')).fill('1234'), 'setup', 'h1');
    await page.locator(inScreen('setup', 'input')).first().fill('سارا');
    await navigate(page, '//main[@data-screen="setup"]//button[normalize-space(.)="ادامه"]', 'perms', 'h1');
  } finally {
    await page.close();
    await context.close();
  }
}
