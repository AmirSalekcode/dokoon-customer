// k6 speed test for «otp»: phone submitted → code screen (includes the OTP request round-trip).
import { browser } from 'k6/browser';
import { goToLogin, goToOtp, openApp, pageOptions } from '../lib/page.js';

export const options = pageOptions();

export default async function () {
  const { context, page } = await openApp(browser);
  try {
    await goToLogin(page);
    await goToOtp(page, '09131234567');
  } finally {
    await page.close();
    await context.close();
  }
}
