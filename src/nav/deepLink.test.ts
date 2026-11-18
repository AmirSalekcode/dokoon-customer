import { beforeEach, describe, expect, it } from 'vitest';
import { captureDeepLink, enterBootScreen, restaurantLink } from './deepLink';
import { useNav } from './nav';

const screens = () => useNav.getState().stack.map((r) => r.screen);

beforeEach(() => {
  useNav.getState().resetTo('home');
  useNav.getState().setTop('splash');
  history.replaceState(null, '', '/');
});

describe('deep links — shared restaurant links open the restaurant', () => {
  it('restaurantLink builds /?restaurant=<id> on this origin', () => {
    expect(restaurantLink('naghsh')).toBe(`${location.origin}/?restaurant=naghsh`);
  });

  it('a returning user lands on the restaurant with home underneath; the query is removed', () => {
    history.replaceState(null, '', '/?restaurant=burger#x');
    captureDeepLink();
    expect(location.search).toBe('');
    expect(location.hash).toBe('#x');
    enterBootScreen('home');
    expect(screens()).toEqual(['home', 'restaurant']);
    expect(useNav.getState().stack.at(-1)!.params).toEqual({ restaurantId: 'burger' });
    // consumed once: a later boot does not reopen it
    useNav.getState().resetTo('home');
    useNav.getState().setTop('splash');
    enterBootScreen('home');
    expect(screens()).toEqual(['home']);
  });

  it('a new user goes through onboarding first; the link opens once home is reached', () => {
    history.replaceState(null, '', '/?restaurant=cafe');
    captureDeepLink();
    enterBootScreen('onboard');
    expect(screens()).toEqual(['onboard']);
    enterBootScreen('home');
    expect(screens()).toEqual(['home', 'restaurant']);
  });

  it('ignores malformed ids', () => {
    history.replaceState(null, '', '/?restaurant=%3Cscript%3E');
    captureDeepLink();
    enterBootScreen('home');
    expect(screens()).toEqual(['home']);
  });
});
