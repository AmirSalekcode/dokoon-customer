import { expect, test, type Page } from '@playwright/test';
import { SCREEN_IDS, type ScreenId } from '../src/nav/types';

/**
 * App-wide integrity pass (KAN-42). Opens EVERY screen on top of Home through the mock-only
 * `window.__dkNav` hook and checks, in a real browser at 390×844:
 *  - the real screen renders (no placeholder), Yekan Bakh on every element, no ASCII digits;
 *  - every interactive control has an accessible name and a ≥48px touch target;
 *  - system back (browser back = Android back handler) returns to the exact previous screen.
 * Plus: only one overlay at a time, and back closes it before leaving the screen.
 */

const PARAMS: Partial<Record<ScreenId, Record<string, string>>> = {
  restaurant: { restaurantId: 'naghsh' },
  restinfo: { restaurantId: 'naghsh' },
  campaign: { campaignId: 'b1' },
  otp: { phone: '09121234567' },
  gateway: { orderId: 'o1' },
  payfail: { orderId: 'o1' },
  paid: { orderId: 'o1' },
  track: { orderId: 'o1' },
  cancel: { orderId: 'o1' },
  report: { orderId: 'o0' },
  rateorder: { orderId: 'o0' },
  legal: { kind: 'terms' },
  apply: { kind: 'restaurant' },
  error: { kind: 'e404' },
};

const top = (page: Page) => page.locator('main:not([hidden])');

/**
 * Screens whose back is intentionally NOT "pop to previous" (screen-specs) and what it does instead.
 * splash is handled separately: it replaces itself with the next boot step.
 */
const BACK_EXCEPTIONS: Partial<Record<ScreenId, (page: Page) => Promise<void>>> = {
  // A new user must enter a name: back stays on setup and explains why.
  setup: async (page) => {
    await expect(page.getByText('برای ادامه، نام خود را وارد کنید.')).toBeVisible();
    await expect(top(page)).toHaveAttribute('data-screen', 'setup');
  },
  // Back on the gateway = cancel the payment. For a pending order that lands on payfail (covered in
  // orders.spec.ts, which creates one through checkout). The seed order here cannot be settled by
  // the mock server, so the cancel call fails: the user must see an error and stay — never a
  // silent exit with an unknown payment state.
  gateway: async (page) => {
    await expect(page.getByText('اتصال برقرار نشد. دوباره تلاش کنید.')).toBeVisible();
    await expect(top(page)).toHaveAttribute('data-screen', 'gateway');
  },
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    const set = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));
    set('dk-consent', { version: 1, analytics: false, decidedAt: '2026-11-18' });
    set('dk-launch', { seenOnboarding: true, cityId: 'shahreza' });
    set('dk-session', { accessToken: 'a', refreshToken: 'r', user: null });
  });
  await page.goto('/');
  await expect(top(page)).toHaveAttribute('data-screen', 'home');
  await expect(top(page).getByText('سلام امیر عزیز')).toBeVisible();
});

type Nav = {
  getState: () => {
    push: (s: string, p?: Record<string, string>) => void;
    openOverlay: (o: { kind: string }) => void;
  };
};

async function push(page: Page, id: ScreenId) {
  await page.evaluate(([s, p]) => (window as unknown as { __dkNav: Nav }).__dkNav.getState().push(s, p), [
    id,
    PARAMS[id] ?? {},
  ] as const);
}

/** Waits until loading skeletons are gone, then audits the visible screen in the page. */
async function audit(page: Page) {
  await expect(top(page).locator('[aria-busy="true"], [role="status"][aria-label*="بارگذاری"]')).toHaveCount(
    0,
    {
      timeout: 10_000,
    },
  );
  return page.evaluate(() => {
    const root = document.querySelector('main:not([hidden])')!;
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
    };
    const describe = (el: Element) =>
      `<${el.tagName.toLowerCase()} class="${el.getAttribute('class') ?? ''}"> ${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40)}`;

    // Literal codes the user types in Latin (promo codes) are marked data-latin and skipped.
    let text = (root as HTMLElement).innerText;
    for (const el of root.querySelectorAll<HTMLElement>('[data-latin]'))
      text = text.split(el.innerText).join('');
    const digits = text.match(/[^\s]*[0-9][^\s]*/g) ?? [];

    const fonts = [...root.querySelectorAll('*')]
      .filter((el) => visible(el) && !(el instanceof SVGElement))
      .filter((el) => !getComputedStyle(el).fontFamily.includes('Yekan Bakh'))
      .map(describe);

    const name = (el: Element) => {
      const aria = el.getAttribute('aria-label') ?? '';
      const by = el.getAttribute('aria-labelledby');
      const byText = by
        ? by
            .split(' ')
            .map((id) => document.getElementById(id)?.textContent ?? '')
            .join('')
        : '';
      const labels = (el as HTMLInputElement).labels
        ? [...(el as HTMLInputElement).labels!].map((l) => l.textContent).join('')
        : '';
      return (
        aria +
        byText +
        labels +
        (el.getAttribute('title') ?? '') +
        (el.getAttribute('placeholder') ?? '') +
        (el.textContent ?? '')
      ).trim();
    };
    const controls = [
      ...root.querySelectorAll(
        'button, a[href], [role="button"], [role="switch"], [role="tab"], [role="radio"], [role="checkbox"], input:not([type="hidden"]), select, textarea',
      ),
    ].filter(visible);
    const unnamed = controls.filter((el) => !name(el)).map(describe);

    // Effective hit area: the box plus any absolutely positioned ::before/::after that extends it,
    // or its <label> (a visually hidden input is operated through it: custom checkbox, file picker).
    const hit = (el: Element) => {
      const r = el.getBoundingClientRect();
      let { width: w, height: h } = r;
      for (const p of ['::before', '::after']) {
        const cs = getComputedStyle(el, p);
        if (cs.content === 'none' || cs.position !== 'absolute') continue;
        const px = (v: string) => (v.endsWith('px') ? parseFloat(v) : 0);
        w = Math.max(w, r.width - px(cs.left) - px(cs.right), parseFloat(cs.width) || 0);
        h = Math.max(h, r.height - px(cs.top) - px(cs.bottom), parseFloat(cs.height) || 0);
      }
      const labels = [...((el as HTMLInputElement).labels ?? []), el.closest('label')];
      for (const l of labels) {
        if (!l) continue;
        const lr = l.getBoundingClientRect();
        w = Math.max(w, lr.width);
        h = Math.max(h, lr.height);
      }
      return { w, h };
    };
    const small = controls
      .map((el) => ({ el, ...hit(el) }))
      .filter(({ w, h }) => Math.round(Math.min(w, h)) < 48)
      .map(({ el, w, h }) => `${describe(el)} (${Math.round(w)}×${Math.round(h)})`);

    const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    return { digits, fonts, unnamed, small, overflow };
  });
}

for (const id of SCREEN_IDS) {
  test(`screen ${id}: renders, design rules hold, back returns to the previous screen`, async ({ page }) => {
    await push(page, id);
    if (id === 'splash') {
      // Splash replaces itself (boot flow) — it must leave and never strand the user.
      await expect(top(page)).not.toHaveAttribute('data-screen', 'splash', { timeout: 10_000 });
      return;
    }
    await expect(top(page)).toHaveAttribute('data-screen', id);
    await expect(top(page).getByText('این صفحه در مرحله‌ی بعد ساخته می‌شود.')).toHaveCount(0);

    const r = await audit(page);
    expect.soft(r.digits, 'ASCII digits in visible text').toEqual([]);
    expect.soft(r.fonts, 'elements not in Yekan Bakh').toEqual([]);
    expect.soft(r.unnamed, 'controls without an accessible name').toEqual([]);
    expect.soft(r.small, 'touch targets under 48px').toEqual([]);
    expect.soft(r.overflow, 'horizontal scroll').toBeLessThanOrEqual(0);
    await expect.soft(page.getByRole('dialog')).toHaveCount(0);

    await page.goBack();
    const instead = BACK_EXCEPTIONS[id];
    if (instead) return instead(page);
    await expect(top(page)).toHaveAttribute('data-screen', 'home');
    await expect(top(page).getByText('سلام امیر عزیز')).toBeVisible();
  });
}

test('only one overlay at a time; system back closes it before leaving the screen', async ({ page }) => {
  await push(page, 'restaurant');
  await expect(top(page)).toHaveAttribute('data-screen', 'restaurant');
  await page.evaluate(() => {
    const nav = (window as unknown as { __dkNav: Nav }).__dkNav.getState();
    nav.openOverlay({ kind: 'menu' });
    nav.openOverlay({ kind: 'filter' });
  });
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(top(page)).toHaveAttribute('data-screen', 'restaurant');
  await page.goBack();
  await expect(top(page)).toHaveAttribute('data-screen', 'home');
});
