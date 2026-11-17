import { setBackInterceptor, topRoute, useNav } from './nav';
import { useToast } from '@/ui/toast';

const nav = () => useNav.getState();

describe('stack navigation', () => {
  beforeEach(() => {
    nav().resetTo('home');
    useNav.setState({ exitArmedAt: 0 });
  });

  it('push/back returns to the exact previous route (same key)', () => {
    nav().push('restaurant', { restaurantId: 'naghsh' });
    const restKey = topRoute().key;
    nav().push('restinfo', { restaurantId: 'naghsh' });
    expect(nav().back()).toBe(true);
    expect(topRoute().key).toBe(restKey);
    expect(topRoute().params.restaurantId).toBe('naghsh');
  });

  it('setTop replaces without growing the stack', () => {
    nav().push('login');
    nav().setTop('otp');
    expect(nav().stack.map((r) => r.screen)).toEqual(['home', 'otp']);
  });

  it('tabs reset the stack', () => {
    nav().push('restaurant');
    nav().push('restinfo');
    nav().resetTo('cart');
    expect(nav().stack.map((r) => r.screen)).toEqual(['cart']);
  });

  it('system back closes an overlay first, then pops', () => {
    nav().push('restaurant');
    nav().openOverlay({ kind: 'food' });
    expect(nav().handleSystemBack()).toBe('overlay');
    expect(nav().overlay).toBeNull();
    expect(nav().handleSystemBack()).toBe('popped');
    expect(topRoute().screen).toBe('home');
  });

  it('only one overlay at a time; child overlay can restore its parent', () => {
    nav().openOverlay({ kind: 'food' });
    nav().openOverlay({ kind: 'review' }, { keepParent: true });
    expect(nav().overlay?.kind).toBe('review');
    nav().closeOverlay();
    expect(nav().overlay?.kind).toBe('food');
    nav().openOverlay({ kind: 'menu' });
    expect(nav().overlay?.kind).toBe('menu');
    nav().closeOverlay();
    expect(nav().overlay).toBeNull();
  });

  it('route interceptors handle back (paid → home)', () => {
    nav().push('checkout');
    nav().push('paid');
    setBackInterceptor(topRoute().key, () => {
      nav().resetTo('home');
      return true;
    });
    expect(nav().handleSystemBack()).toBe('intercepted');
    expect(nav().stack.map((r) => r.screen)).toEqual(['home']);
  });

  it('at home root: first back warns, second back exits', () => {
    expect(nav().handleSystemBack()).toBe('exit-armed');
    expect(useToast.getState().toasts[0]?.text).toBe('برای خروج دوباره بزنید');
    expect(nav().handleSystemBack()).toBe('exit');
  });

  it('at another tab root, back goes to home', () => {
    nav().resetTo('offers');
    expect(nav().handleSystemBack()).toBe('popped');
    expect(topRoute().screen).toBe('home');
  });

  it('showError does not stack the same kind twice', () => {
    nav().showError('offline');
    nav().showError('offline');
    expect(nav().stack.filter((r) => r.screen === 'error')).toHaveLength(1);
  });
});
