// Shared helpers for per-screen k6 browser speed tests.
// Run:  k6 run perf/pages/home.js            (BASE_URL defaults to http://localhost:4173 = `vite preview`)
// Env:  BASE_URL, ITERATIONS (default 5), K6_BROWSER_EXECUTABLE_PATH (Chromium), K6_BROWSER_HEADLESS
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';

export const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:4173';

/** Time from the user action to the target screen being visible (soft navigation). */
export const screenReady = new Trend('screen_ready', true);
/** Iterations that really loaded the app. Guards against "green" runs where the browser never started. */
export const pagesMeasured = new Counter('pages_measured');
const ITERATIONS = Number(__ENV.ITERATIONS || 5);

/**
 * Budgets (mobile, mock API): Core Web Vitals "good" thresholds from web.dev at p75,
 * plus an in-app screen transition budget.
 */
export function pageOptions(extra = {}) {
  return {
    scenarios: {
      ui: {
        executor: 'shared-iterations',
        vus: 1,
        iterations: ITERATIONS,
        options: { browser: { type: 'chromium' } },
      },
    },
    thresholds: {
      browser_web_vital_lcp: ['p(75)<2500'],
      browser_web_vital_fcp: ['p(75)<1800'],
      browser_web_vital_cls: ['p(75)<0.1'],
      screen_ready: ['p(95)<1000'],
      checks: ['rate==1'],
      pages_measured: [`count>=${ITERATIONS}`],
      ...extra,
    },
  };
}

const visible = (screen) => `main[data-screen="${screen}"]:not([hidden])`;

/** Open the app at 390×844 with cookie consent already decided (the popup is tested separately). */
export async function openApp(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fa-IR' });
  await context.addInitScript(() => {
    localStorage.setItem(
      'dk-consent',
      JSON.stringify({ version: 1, analytics: false, decidedAt: '2026-11-18' }),
    );
  });
  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page
    .locator(`${visible('home')} section`)
    .first()
    .waitFor({ state: 'visible' });
  pagesMeasured.add(1);
  return { context, page };
}

/** Click `selector`, then measure until `screen` is the visible top screen with `readySelector` inside. */
export async function navigate(page, selector, screen, readySelector = 'h1, h2') {
  const t0 = Date.now();
  await page.locator(selector).first().click();
  await page
    .locator(`${visible(screen)} ${readySelector}`)
    .first()
    .waitFor({ state: 'visible' });
  const ms = Date.now() - t0;
  screenReady.add(ms, { screen });
  check(ms, { [`${screen} ready < 1s`]: (v) => v < 1000 });
  return ms;
}

export const NAV = {
  cart: 'nav[aria-label="منوی اصلی"] button:nth-child(3)',
  account: 'nav[aria-label="منوی اصلی"] button:nth-child(5)',
};
