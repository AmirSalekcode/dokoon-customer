// k6 speed test for the «splash» screen (first install): web vitals of the initial load.
import { browser } from 'k6/browser';
import { check } from 'k6';
import { openFresh, pageOptions } from '../lib/page.js';

export const options = pageOptions();

export default async function () {
  const { context, page, ms } = await openFresh(browser, 'splash', 'p');
  try {
    check(ms, { 'splash visible < 1s': (v) => v < 1000 });
  } finally {
    await page.close();
    await context.close();
  }
}
