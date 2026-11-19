import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSession } from '@/auth/session';
import { useCart } from '@/cart/cart';
import { useFavorites } from '@/features/favorites';
import * as D from '@/mocks/data';
import { server } from '@/mocks/node';
import { useNav } from '@/nav/nav';
import type { Route } from '@/nav/types';
import { useToast } from '@/ui/toast';
import { RestaurantScreen } from './RestaurantScreen';

const route = (id: string): Route => ({ key: `r-${id}`, screen: 'restaurant', params: { restaurantId: id } });
const top = () => useNav.getState().stack.at(-1)!;

beforeEach(() => {
  localStorage.clear();
  useSession.getState().clear();
  useCart.getState().clear();
  useFavorites.getState().clear();
  useNav.getState().resetTo('home');
  useNav.getState().push('restaurant', { restaurantId: 'naghsh' });
  Element.prototype.scrollIntoView = vi.fn();
});

const ready = () => screen.findByRole('heading', { level: 1, name: 'کباب‌سرای نقش‌جهان' });

describe('<RestaurantScreen /> — spec §2 restaurant', () => {
  it('header shows rating, ETA (display only), delivery fee and hours — no minimum order', async () => {
    render(<RestaurantScreen route={route('naghsh')} />);
    expect(screen.getByRole('status', { name: 'در حال بارگذاری' })).toBeInTheDocument();
    const header = await screen.findByRole('region', { name: 'کباب‌سرای نقش‌جهان' });
    expect(header).toHaveTextContent('۴٫۸');
    expect(header).toHaveTextContent('۲۵–۳۵');
    expect(header).toHaveTextContent('۴۵٬۰۰۰');
    // No minimum order (owner decision D-89).
    expect(header).not.toHaveTextContent('حداقل سفارش');
    expect(header).toHaveTextContent('۱۱:۰۰ تا ۲۳:۰۰');
    expect(header).toHaveTextContent('باز');
  });

  it('sticky category chips list the menu sections; tapping one scrolls to it', async () => {
    render(<RestaurantScreen route={route('naghsh')} />);
    await ready();
    const tabs = screen.getByRole('navigation', { name: 'دسته‌بندی منو' });
    expect(
      within(tabs)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['پرفروش‌ها', 'خورشت‌ها']);
    await userEvent.click(within(tabs).getByRole('button', { name: 'خورشت‌ها' }));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(within(tabs).getByRole('button', { name: 'خورشت‌ها' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('menu search filters foods; no match shows an empty state', async () => {
    render(<RestaurantScreen route={route('naghsh')} />);
    await ready();
    const search = screen.getByLabelText('جستجو در منوی رستوران');
    await userEvent.type(search, 'برگ');
    expect(screen.getByRole('button', { name: 'کباب برگ' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'چلو کباب کوبیده' })).toBeNull();
    await userEvent.clear(search);
    await userEvent.type(search, 'پیتزا');
    expect(screen.getByRole('heading', { name: 'غذایی پیدا نشد' })).toBeInTheDocument();
  });

  it('adding a simple food fills the shared cart and shows the sticky cart bar', async () => {
    render(<RestaurantScreen route={route('naghsh')} />);
    await ready();
    expect(screen.queryByRole('button', { name: /مشاهده سبد خرید/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'افزودن کباب برگ به سبد' }));
    const bar = await screen.findByRole('button', { name: /مشاهده سبد خرید/ });
    expect(bar).toHaveTextContent('۴۲۰٬۰۰۰');
    await userEvent.click(screen.getByRole('button', { name: 'افزودن یک عدد کباب برگ' }));
    expect(bar).toHaveTextContent('۸۴۰٬۰۰۰');
    await userEvent.click(bar);
    expect(top().screen).toBe('cart');
  });

  it('foods with options open the food sheet instead of adding directly', async () => {
    render(<RestaurantScreen route={route('naghsh')} />);
    await ready();
    await userEvent.click(screen.getByRole('button', { name: 'افزودن چلو کباب کوبیده به سبد' }));
    expect(useNav.getState().overlay).toMatchObject({
      kind: 'food',
      props: { foodId: 'n1', restaurantId: 'naghsh' },
    });
  });

  it('closed restaurant: «بازشدن بعدی» notice, no add buttons', async () => {
    render(<RestaurantScreen route={route('cafe')} />);
    await screen.findByRole('heading', { level: 1, name: 'کافه گلستان' });
    expect(screen.getByRole('status')).toHaveTextContent('بازشدن بعدی: فردا ساعت ۹:۰۰');
    expect(screen.queryByRole('button', { name: /^افزودن .* به سبد$/ })).toBeNull();
  });

  it('restaurant without a menu shows an empty state', async () => {
    server.use(
      http.get('*/v1/restaurants/naghsh', () => HttpResponse.json({ ...D.restaurants[0], hasMenu: false })),
    );
    render(<RestaurantScreen route={route('naghsh')} />);
    expect(await screen.findByRole('heading', { name: 'منو به‌زودی اضافه می‌شود' })).toBeInTheDocument();
  });

  it('unknown restaurant → 404 page', async () => {
    render(<RestaurantScreen route={route('nope')} />);
    await waitFor(() => expect(top()).toMatchObject({ screen: 'error', params: { kind: 'e404' } }));
  });

  it('«اطلاعات رستوران و ساعت کاری» opens restinfo', async () => {
    render(<RestaurantScreen route={route('naghsh')} />);
    await ready();
    await userEvent.click(screen.getByRole('button', { name: 'اطلاعات رستوران و ساعت کاری' }));
    expect(top()).toMatchObject({ screen: 'restinfo', params: { restaurantId: 'naghsh' } });
  });

  it('favorite: guest → login; logged in → instant toggle', async () => {
    render(<RestaurantScreen route={route('burger')} />);
    await screen.findByRole('heading', { level: 1, name: 'برگر لاین' });
    await userEvent.click(screen.getByRole('button', { name: 'افزودن به علاقه‌مندی‌ها' }));
    expect(top().screen).toBe('login');
    useNav.getState().back();
    useSession.getState().setSession({ accessToken: 'a', refreshToken: 'r' });
    await userEvent.click(screen.getByRole('button', { name: 'افزودن به علاقه‌مندی‌ها' }));
    expect(screen.getByRole('button', { name: 'حذف از علاقه‌مندی‌ها' })).toBeInTheDocument();
  });

  it('share uses the system share sheet, or copies the link as a fallback', async () => {
    render(<RestaurantScreen route={route('naghsh')} />);
    await ready();
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    await userEvent.click(screen.getByRole('button', { name: 'اشتراک‌گذاری' }));
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ title: 'کباب‌سرای نقش‌جهان' }));
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    await userEvent.click(screen.getByRole('button', { name: 'اشتراک‌گذاری' }));
    await waitFor(() => expect(useToast.getState().toasts[0]?.text).toBe('لینک رستوران کپی شد'));
    expect(writeText).toHaveBeenCalled();
  });
});
