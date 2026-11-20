import { beforeEach, describe, expect, it } from 'vitest';
import { useToast } from '@/ui/toast';
import { PANEL_TABS, usePanelNav } from './nav';

const nav = () => usePanelNav.getState();
const screens = () => nav().stack.map((r) => r.screen);

beforeEach(() => {
  nav().resetTo('orders');
  usePanelNav.setState({ exitArmedAt: 0 });
  useToast.setState({ toasts: [] });
});

describe('panel navigation (4 root tabs, exact back, D-20)', () => {
  it('has the four restaurant tabs; orders is home', () => {
    expect(PANEL_TABS).toEqual(['orders', 'menu', 'reports', 'account']);
    expect(screens()).toEqual(['orders']);
  });

  it('switching tabs resets the stack', () => {
    nav().resetTo('account');
    nav().push('help');
    nav().resetTo('menu');
    expect(screens()).toEqual(['menu']);
  });

  it('back pops to the exact previous route, then a non-home tab goes to orders', () => {
    nav().resetTo('account');
    const key = nav().stack[0].key;
    nav().push('help');
    expect(nav().handleSystemBack()).toBe('popped');
    expect(nav().stack[0].key).toBe(key);
    expect(nav().handleSystemBack()).toBe('popped');
    expect(screens()).toEqual(['orders']);
  });

  it('at the orders root: first back warns «برای خروج دوباره بزنید», second exits', () => {
    expect(nav().handleSystemBack()).toBe('exit-armed');
    expect(useToast.getState().toasts[0]?.text).toBe('برای خروج دوباره بزنید');
    expect(nav().handleSystemBack()).toBe('exit');
  });

  it('maintenance/update replace the whole stack and back cannot dismiss them', () => {
    nav().resetTo('error', { kind: 'maintenance' });
    expect(nav().handleSystemBack()).toBe('exit-armed');
    expect(screens()).toEqual(['error']);
  });

  it('one overlay at a time; back closes it first', () => {
    nav().openOverlay({ kind: 'confirm' });
    expect(nav().handleSystemBack()).toBe('overlay');
    expect(nav().overlay).toBeNull();
  });
});
