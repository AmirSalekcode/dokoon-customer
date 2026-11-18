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

// Must be a string: k6's addInitScript silently ignores functions (verified with a probe).
const CONSENT_SEED =
  "try { localStorage.setItem('dk-consent', JSON.stringify({ version: 1, analytics: false, decidedAt: '2026-11-18' })); localStorage.setItem('dk-launch', JSON.stringify({ seenOnboarding: true, cityId: 'shahreza' })); } catch (e) {}";

const visible = (screen) => `main[data-screen="${screen}"]:not([hidden])`;

/** Open the app at 390×844 as a returning user (consent decided, onboarding done, city chosen). */
export async function openApp(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fa-IR' });
  await context.addInitScript(CONSENT_SEED);
  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page
    .locator(`${visible('home')} section`)
    .first()
    .waitFor({ state: 'visible' });
  pagesMeasured.add(1);
  return { context, page };
}

/** Run `action` (click, typing…), then measure until `screen` is the visible top screen with `readySelector`. */
export async function transition(page, action, screen, readySelector = 'h1, h2') {
  const t0 = Date.now();
  await action();
  await page
    .locator(`${visible(screen)} ${readySelector}`)
    .first()
    .waitFor({ state: 'visible' });
  const ms = Date.now() - t0;
  screenReady.add(ms, { screen });
  check(ms, { [`${screen} ready < 1s`]: (v) => v < 1000 });
  return ms;
}

/** Click `selector`, then measure until `screen` is the visible top screen with `readySelector` inside. */
export async function navigate(page, selector, screen, readySelector = 'h1, h2') {
  return transition(page, () => page.locator(selector).first().click(), screen, readySelector);
}

/** Inside the visible screen. */
export const inScreen = (screen, selector) => `${visible(screen)} ${selector}`;

/** Returning guest → account tab → login screen. */
export async function goToLogin(page) {
  await navigate(page, NAV.account, 'account', 'h2');
  await navigate(
    page,
    '//main[@data-screen="account"]//button[normalize-space(.)="ورود یا ثبت‌نام"]',
    'login',
    'h1',
  );
}

/** Login screen → OTP screen for `phone`. */
export async function goToOtp(page, phone) {
  await page.locator(inScreen('login', 'input')).fill(phone);
  await page.locator(inScreen('login', '[role="checkbox"]')).click();
  await navigate(
    page,
    '//main[@data-screen="login"]//button[normalize-space(.)="دریافت کد تأیید"]',
    'otp',
    'h1',
  );
}

// First install: only the cookie decision (so the popup doesn't cover buttons); no launch state.
const FIRST_VISIT_SEED =
  "try { localStorage.setItem('dk-consent', JSON.stringify({ version: 1, analytics: false, decidedAt: '2026-11-18' })); } catch (e) {}";

/**
 * Open the app as a brand-new user and wait for `screen` (splash → onboard → …).
 * Records the time from navigation start to that screen as screen_ready.
 */
export async function openFresh(browser, screen = 'splash', readySelector = 'h1, p') {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fa-IR' });
  await context.addInitScript(FIRST_VISIT_SEED);
  const page = await context.newPage();
  const t0 = Date.now();
  // Don't wait for network idle: we measure when the screen appears, not when all requests settle.
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page
    .locator(`${visible(screen)} ${readySelector}`)
    .first()
    .waitFor({ state: 'visible' });
  pagesMeasured.add(1);
  return { context, page, ms: Date.now() - t0 };
}

export const NAV = {
  cart: 'nav[aria-label="منوی اصلی"] button:nth-child(3)',
  account: 'nav[aria-label="منوی اصلی"] button:nth-child(5)',
};

const CART_SEED = {
  restaurant: { id: 'naghsh', name: 'کباب‌سرای نقش‌جهان' },
  lines: [{ lineId: 'n2', foodId: 'n2', title: 'کباب برگ', unitPrice: 420000, qty: 1, options: [] }],
  note: '',
  promoCode: '',
};
const ADDRESS_SEED = {
  id: 'a1',
  title: 'خانه',
  fullText: 'شهرضا، خیابان امام، کوچه‌ی ۱۲',
  location: { lat: 32.0089, lng: 51.8668 },
  recipientName: 'امیر',
  recipientPhone: '09131234567',
  inZone: true,
};

/**
 * Open the app as a logged-in returning user with one food in the cart (mock API).
 * `withAddress` also seeds one saved delivery address in the mock database.
 */
export async function openWithCart(browser, { withAddress = false, stepMs = 0 } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fa-IR' });
  const seed = {
    'dk-session': { accessToken: 'mock-access', refreshToken: 'mock-refresh', user: null },
    'dk-cart': CART_SEED,
    'dk-mock-db': { addresses: withAddress ? [ADDRESS_SEED] : [], orders: [], seq: withAddress ? 1 : 0 },
    ...(stepMs ? { 'dk-mock-step-ms': stepMs } : {}),
  };
  await context.addInitScript(
    `${CONSENT_SEED} try { const s = ${JSON.stringify(seed)}; if (!sessionStorage.getItem('dk-k6-seeded')) { for (const k in s) localStorage.setItem(k, JSON.stringify(s[k])); sessionStorage.setItem('dk-k6-seeded', '1'); } } catch (e) {}`,
  );
  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page
    .locator(`${visible('home')} section`)
    .first()
    .waitFor({ state: 'visible' });
  pagesMeasured.add(1);
  return { context, page };
}

/** Cart tab → checkout (the CTA is enabled once the server quote arrives). */
export async function goToCheckout(page) {
  await navigate(page, NAV.cart, 'cart', 'h2');
  const cta =
    '//main[@data-screen="cart"]//button[starts-with(normalize-space(.), "ادامه و تکمیل سفارش")][not(@disabled)]';
  await page.locator(cta).waitFor({ state: 'visible' });
  await navigate(page, cta, 'checkout', 'h2');
}

const CHECKOUT = '//main[@data-screen="checkout"]';

/** Checkout → online payment → gateway simulator. */
export async function goToGateway(page) {
  await goToCheckout(page);
  await navigate(
    page,
    `${CHECKOUT}//button[starts-with(normalize-space(.), "ثبت سفارش")][not(@disabled)]`,
    'gateway',
    'h2',
  );
}

/** Checkout → cash on delivery → paid → «پیگیری سفارش» → track. */
export async function goToTrack(page) {
  await goToCheckout(page);
  await page
    .locator(`${CHECKOUT}//button[@role="radio"][.//*[normalize-space(.)="نقدی هنگام تحویل"]]`)
    .click();
  await navigate(
    page,
    `${CHECKOUT}//button[starts-with(normalize-space(.), "ثبت سفارش")][not(@disabled)]`,
    'paid',
    'h1',
  );
  await navigate(
    page,
    '//main[@data-screen="paid"]//button[normalize-space(.)="پیگیری سفارش"]',
    'track',
    'h1',
  );
}

export const trackButton = (label) => `//main[@data-screen="track"]//button[normalize-space(.)="${label}"]`;

/** Logged-in user → account tab → menu item `label` → `screen`. */
export async function goToAccountItem(page, label, screen) {
  await navigate(page, NAV.account, 'account', 'h2');
  await navigate(
    page,
    `//main[@data-screen="account"]//button[.//*[normalize-space(.)="${label}"] or normalize-space(.)="${label}"]`,
    screen,
    'h2',
  );
}
