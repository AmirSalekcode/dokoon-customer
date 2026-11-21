import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePanelNav } from '../nav/nav';
import { useOrdersUi } from '../state/ordersUi';
import { signedIn, signedOut } from '../test/session';

const platform = vi.hoisted(() => ({ native: false }));
vi.mock('@/lib/platform', async (orig) => ({
  ...(await orig<typeof import('@/lib/platform')>()),
  isNative: () => platform.native,
}));

const { canAutoStartShift, openPanelLink, parsePanelLink } = await import('./app');
const { enter } = await import('../auth/flow');
const { setSoundEngine } = await import('../sound/engine');
const { setWakeLock } = await import('../sound/wakeLock');
const { useShift } = await import('../state/shift');

// KAN-71: restaurant Android app — auto shift start and deep links.
const top = () => usePanelNav.getState().stack.at(-1)!;

beforeEach(() => {
  platform.native = false;
  useOrdersUi.getState().reset();
  usePanelNav.getState().resetTo('login');
});
afterEach(() => {
  setSoundEngine(null);
  setWakeLock(null);
  signedOut();
});

describe('parsePanelLink', () => {
  it('reads the app scheme and the panel domain', () => {
    expect(parsePanelLink('ir.dokoonapp.restaurant://order/o-12')).toEqual({ screen: 'order', id: 'o-12' });
    expect(parsePanelLink('ir.dokoonapp.restaurant://orders')).toEqual({ screen: 'orders' });
    expect(parsePanelLink('https://panel.dokoonapp.ir/notifs')).toEqual({ screen: 'notifs' });
  });

  it('ignores foreign hosts, unknown or unsafe screens and malformed ids', () => {
    for (const url of [
      'https://evil.example/order/1',
      'ir.dokoonapp.customer://orders',
      'ir.dokoonapp.restaurant://login',
      'ir.dokoonapp.restaurant://error',
      'ir.dokoonapp.restaurant://order/',
      'ir.dokoonapp.restaurant://order/a%20b',
      'ir.dokoonapp.restaurant://orders/extra',
      'not a url',
    ])
      expect(parsePanelLink(url), url).toBeNull();
  });
});

describe('openPanelLink', () => {
  it('is ignored before sign-in or before the shift started', () => {
    expect(openPanelLink({ screen: 'menu' })).toBe(false);
    signedIn('active', '09131234567', false);
    expect(openPanelLink({ screen: 'menu' })).toBe(false);
    expect(top().screen).toBe('login');
  });

  it('opens an order over the orders tab so back returns to the list', () => {
    signedIn();
    expect(openPanelLink({ screen: 'order', id: 'o-1' })).toBe(true);
    expect(usePanelNav.getState().stack.map((r) => r.screen)).toEqual(['orders', 'order']);
    expect(top().params).toEqual({ id: 'o-1' });
    expect(useOrdersUi.getState().selectedId).toBe('o-1');
  });

  it('opens account sub-screens on top of the account tab', () => {
    signedIn();
    openPanelLink({ screen: 'notifs' });
    expect(usePanelNav.getState().stack.map((r) => r.screen)).toEqual(['account', 'notifs']);
    openPanelLink({ screen: 'reports' });
    expect(usePanelNav.getState().stack.map((r) => r.screen)).toEqual(['reports']);
  });
});

describe('auto shift start', () => {
  function fakes() {
    const unlock = vi.fn(async () => true);
    setSoundEngine({ unlock, stopAlert: vi.fn() } as never);
    setWakeLock({ acquire: vi.fn(async () => true), release: vi.fn(async () => {}) } as never);
    return unlock;
  }

  it('the browser panel still asks for the «شروع شیفت» tap', () => {
    fakes();
    signedIn('active', '09131234567', false);
    expect(canAutoStartShift()).toBe(false);
    enter('active');
    expect(top().screen).toBe('shift');
    expect(useShift.getState().started).toBe(false);
  });

  it('the Android app skips the shift screen and unlocks sound by itself', async () => {
    platform.native = true;
    const unlock = fakes();
    signedIn('active', '09131234567', false);
    enter('active');
    expect(usePanelNav.getState().stack.map((r) => r.screen)).toEqual(['orders']);
    expect(useShift.getState().started).toBe(true);
    expect(unlock).toHaveBeenCalledOnce();
    await vi.waitFor(() => expect(useShift.getState().soundOn).toBe(true));
  });

  it('a restaurant under review still goes to its status screen in the app', () => {
    platform.native = true;
    fakes();
    signedIn('pending', '09131234567', false);
    enter('pending');
    expect(top().screen).toBe('reg-status');
    expect(useShift.getState().started).toBe(false);
  });
});
