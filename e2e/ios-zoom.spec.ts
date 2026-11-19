import { devices, expect, test, type Browser } from '@playwright/test';

/**
 * iPhone/iPad Safari zooms the page in when a field with text under 16px is focused.
 * On iOS every visible field must be ≥ 16px; on other devices the designed sizes stay.
 */
const FIELD_SCREENS: [string, Record<string, string>?][] = [
  ['login'],
  ['search'],
  ['restaurant', { restaurantId: 'naghsh' }],
  ['cart'],
  ['addaddr'],
  ['editprof'],
  ['support'],
  ['report', { orderId: 'o1' }],
  ['rateorder', { orderId: 'o1' }],
  ['rateapp'],
  ['apply', { kind: 'restaurant' }],
];
const TABS = new Set(['search', 'cart']);

async function fieldSizes(browser: Browser, device: (typeof devices)[string]) {
  const ctx = await browser.newContext({ ...device, viewport: { width: 390, height: 844 }, locale: 'fa-IR' });
  await ctx.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    const set = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));
    set('dk-consent', { version: 1, analytics: false, decidedAt: '2026-11-18' });
    set('dk-launch', { seenOnboarding: true, cityId: 'shahreza' });
    set('dk-session', {
      accessToken: 'a',
      refreshToken: 'r',
      user: { id: 'u1', phone: '09131234567', name: 'امیر' },
    });
    set('dk-cart', {
      restaurant: { id: 'naghsh', name: 'کباب‌سرای نقش‌جهان' },
      lines: [{ lineId: 'n2', foodId: 'n2', title: 'کباب برگ', unitPrice: 420000, qty: 1, options: [] }],
      note: '',
      promoCode: '',
    });
  });
  const page = await ctx.newPage();
  await page.goto('/');
  await page.locator('main[data-screen="home"]:not([hidden]) section').first().waitFor();
  const sizes: { screen: string; field: string; px: number }[] = [];
  for (const [id, params] of FIELD_SCREENS) {
    await page.evaluate(
      async ({ id, params, tab }) => {
        const navUrl = '/src/nav/nav.ts';
        const { useNav } = (await import(/* @vite-ignore */ navUrl)) as {
          useNav: {
            getState(): {
              resetTo(screen: string): void;
              push(screen: string, params: Record<string, string>): void;
            };
          };
        };
        useNav.getState().resetTo(tab ? id : 'home');
        if (!tab) useNav.getState().push(id, params ?? {});
      },
      { id, params, tab: TABS.has(id) },
    );
    await page.locator(`main[data-screen="${id}"]:not([hidden])`).waitFor();
    await page.waitForTimeout(500);
    const found = await page.evaluate((id) => {
      const main = document.querySelector(`main[data-screen="${id}"]:not([hidden])`)!;
      return Array.from(main.querySelectorAll('input, textarea, select'))
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return (el as HTMLInputElement).type !== 'file' && r.width > 4 && r.height > 4;
        })
        .map((el) => ({
          field: el.getAttribute('placeholder') || el.id,
          px: parseFloat(getComputedStyle(el).fontSize),
        }));
    }, id);
    for (const f of found) sizes.push({ screen: id, ...f });
  }
  // OTP code field is designed large (24px) and must keep its size.
  await page.evaluate(async () => {
    const navUrl = '/src/nav/nav.ts';
    const { useNav } = (await import(/* @vite-ignore */ navUrl)) as {
      useNav: { getState(): { push(screen: string, params: Record<string, string>): void } };
    };
    useNav.getState().push('otp', { phone: '09131234567' });
  });
  const otp = page.locator('main[data-screen="otp"]:not([hidden]) input');
  await otp.waitFor();
  const otpPx = await otp.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  await ctx.close();
  return { sizes, otpPx };
}

test('iPhone: no field under 16px (no zoom on tap); OTP code keeps 24px', async ({ browser }) => {
  const { sizes, otpPx } = await fieldSizes(browser, devices['iPhone 14']);
  expect(sizes.length).toBeGreaterThan(10);
  expect(sizes.filter((s) => s.px < 16)).toEqual([]);
  expect(otpPx).toBe(24);
});

test('iPad (desktop-class Safari): fields are 16px too', async ({ browser }) => {
  const ipad = devices['iPad (gen 7)'];
  const { sizes } = await fieldSizes(browser, {
    ...ipad,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  });
  expect(sizes.filter((s) => s.px < 16)).toEqual([]);
});

test('Android keeps the designed field sizes', async ({ browser }) => {
  const { sizes } = await fieldSizes(browser, devices['Pixel 7']);
  expect(sizes.some((s) => s.px < 16)).toBe(true);
});
