import { beforeEach, describe, expect, it } from 'vitest';
import { useNav } from '@/nav/nav';
import { useSession } from './session';
import {
  AUTH_SCREENS,
  bootScreen,
  completeLogin,
  finishAuth,
  GUARDED_SCREENS,
  openGuarded,
  useLaunch,
  useAuthFlow,
} from './flow';

const screens = () => useNav.getState().stack.map((r) => r.screen);
const login = () =>
  useSession.getState().setSession({ accessToken: 'a', refreshToken: 'r', user: { id: 'u1', name: 'امیر' } });

describe('launch (guest browsing, decision D-59)', () => {
  beforeEach(() => {
    localStorage.clear();
    useLaunch.getState().reset();
    useSession.getState().clear();
  });

  it('first launch → onboarding; then city; then home — no login required', () => {
    expect(bootScreen()).toBe('onboard');
    useLaunch.getState().finishOnboarding();
    expect(bootScreen()).toBe('city');
    useLaunch.getState().setCity('shahreza');
    expect(bootScreen()).toBe('home');
  });

  it('remembers onboarding and city across restarts (localStorage)', () => {
    useLaunch.getState().finishOnboarding();
    useLaunch.getState().setCity('shahreza');
    expect(JSON.parse(localStorage.getItem('dk-launch')!)).toMatchObject({
      seenOnboarding: true,
      cityId: 'shahreza',
    });
  });
});

describe('guarded screens → login → back to the intended action', () => {
  beforeEach(() => {
    localStorage.clear();
    useSession.getState().clear();
    useAuthFlow.getState().reset();
    useNav.getState().resetTo('home');
  });

  it('checkout, orders, favorites and addresses require login; browsing does not', () => {
    for (const s of ['checkout', 'orders', 'favs', 'addresses', 'notifs', 'editprof', 'track'] as const) {
      expect(GUARDED_SCREENS).toContain(s);
    }
    for (const s of ['home', 'restaurant', 'restaurants', 'search', 'cart', 'offers', 'account'] as const) {
      expect(GUARDED_SCREENS).not.toContain(s);
    }
  });

  it('guest opening checkout goes to login and remembers the intent', () => {
    useNav.getState().resetTo('cart');
    openGuarded('checkout');
    expect(screens()).toEqual(['cart', 'login']);
    expect(useAuthFlow.getState().intent).toMatchObject({ screen: 'checkout' });
  });

  it('logged-in user goes straight to the guarded screen', () => {
    login();
    useNav.getState().resetTo('cart');
    openGuarded('checkout');
    expect(screens()).toEqual(['cart', 'checkout']);
  });

  it('known user: login → otp → back to cart with checkout on top (auth screens removed)', () => {
    useNav.getState().resetTo('cart');
    openGuarded('checkout');
    useNav.getState().push('otp');
    login();
    completeLogin({ isNewUser: false });
    expect(screens()).toEqual(['cart', 'checkout']);
    expect(useAuthFlow.getState().intent).toBeNull();
  });

  it('new user: otp → setup → perms → intended screen', () => {
    useNav.getState().resetTo('cart');
    openGuarded('checkout');
    useNav.getState().push('otp');
    login();
    completeLogin({ isNewUser: true });
    expect(screens()).toEqual(['cart', 'login', 'setup']);
    useNav.getState().setTop('perms');
    finishAuth();
    expect(screens()).toEqual(['cart', 'checkout']);
  });

  it('login started without an intent (e.g. from account tab) returns to where the user was', () => {
    useNav.getState().resetTo('account');
    useNav.getState().push('login');
    useNav.getState().push('otp');
    login();
    completeLogin({ isNewUser: false });
    expect(screens()).toEqual(['account']);
  });

  it('auth screens are exactly login/otp/setup/perms', () => {
    expect([...AUTH_SCREENS].sort()).toEqual(['login', 'otp', 'perms', 'setup']);
  });
});
