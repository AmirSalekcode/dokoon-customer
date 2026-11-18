import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLaunch } from '@/auth/flow';
import { useSession } from '@/auth/session';
import { useCart } from '@/cart/cart';
import { useDiscovery } from '@/features/discovery/filters';
import * as D from '@/mocks/data';
import { server } from '@/mocks/node';
import { useNav } from '@/nav/nav';
import type { Route } from '@/nav/types';
import { CampaignScreen } from './browse/CampaignScreen';
import { OffersScreen } from './browse/OffersScreen';
import { RestaurantsScreen } from './browse/RestaurantsScreen';

const top = () => useNav.getState().stack.at(-1)!;
const rRoute: Route = { key: 'restaurants', screen: 'restaurants', params: {} };
const oRoute: Route = { key: 'offers', screen: 'offers', params: {} };
const cRoute = (campaignId: string): Route => ({ key: 'c', screen: 'campaign', params: { campaignId } });

beforeEach(() => {
  localStorage.clear();
  useSession.getState().clear();
  useDiscovery.getState().reset();
  useCart.getState().clear();
  useLaunch.getState().setCity('shahreza');
  useNav.getState().resetTo('home');
});

const cardNames = (root: HTMLElement) =>
  within(root)
    .getAllByRole('heading', { level: 4 })
    .map((h) => h.textContent);

describe('<RestaurantsScreen /> — spec §2 restaurants tab', () => {
  const list = () => screen.findByRole('region', { name: 'لیست رستوران‌ها' });

  it('loading, then the tab title (no back), categories and every restaurant (guest, D-59)', async () => {
    render(<RestaurantsScreen route={rRoute} />);
    expect(screen.getAllByRole('status', { name: 'در حال بارگذاری' }).length).toBeGreaterThan(0);
    const l = await list();
    expect(screen.getByRole('heading', { level: 1, name: 'رستوران‌ها' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'بازگشت' })).toBeNull();
    const cats = await screen.findByRole('navigation', { name: 'دسته‌بندی‌ها' });
    expect(within(cats).getAllByRole('button')).toHaveLength(4);
    await waitFor(() => expect(cardNames(l)).toEqual(D.restaurantCards.map((r) => r.name)));
  });

  it('a category narrows the list through GET /restaurants?category=', async () => {
    render(<RestaurantsScreen route={rRoute} />);
    await list();
    await userEvent.click(await screen.findByRole('button', { name: 'فست‌فود' }));
    await waitFor(async () => expect(cardNames(await list())).toEqual(['برگر لاین']));
    expect(useDiscovery.getState().category).toBe('fast');
  });

  it('the filter button shows the active count and opens the shared filter sheet', async () => {
    useDiscovery.setState({ applied: { ...useDiscovery.getState().applied, openNow: true } });
    render(<RestaurantsScreen route={rRoute} />);
    await userEvent.click(await screen.findByRole('button', { name: 'فیلتر و مرتب‌سازی، ۱ فیلتر فعال' }));
    expect(useNav.getState().overlay?.kind).toBe('filter');
  });

  it('the search bar opens search; a card opens the restaurant', async () => {
    render(<RestaurantsScreen route={rRoute} />);
    const l = await list();
    await userEvent.click(within(l).getByRole('button', { name: /^برگر لاین$/ }));
    expect(top()).toMatchObject({ screen: 'restaurant', params: { restaurantId: 'burger' } });
    await userEvent.click(screen.getByRole('button', { name: 'دنبال چه رستوران یا غذایی؟' }));
    expect(top().screen).toBe('search');
  });

  it('pages with nextCursor: «نمایش بیشتر» appends the next page, then disappears', async () => {
    const seen: (string | null)[] = [];
    server.use(
      http.get('*/v1/restaurants', ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor');
        seen.push(cursor);
        return HttpResponse.json(
          cursor === 'p2'
            ? { items: [D.restaurantCards[2]], nextCursor: null }
            : { items: D.restaurantCards.slice(0, 2), nextCursor: 'p2' },
        );
      }),
    );
    render(<RestaurantsScreen route={rRoute} />);
    const l = await list();
    await waitFor(() => expect(cardNames(l)).toHaveLength(2));
    await userEvent.click(screen.getByRole('button', { name: 'نمایش رستوران‌های بیشتر' }));
    await waitFor(() => expect(cardNames(l)).toEqual(D.restaurantCards.map((r) => r.name)));
    expect(screen.queryByRole('button', { name: 'نمایش رستوران‌های بیشتر' })).toBeNull();
    expect(seen).toEqual([null, 'p2']);
  });

  it('a failed next page keeps the list and offers an inline retry (no error page)', async () => {
    let fail = true;
    server.use(
      http.get('*/v1/restaurants', ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor');
        if (cursor === 'p2')
          return fail
            ? HttpResponse.json({ code: 'X', message: 'x' }, { status: 500 })
            : HttpResponse.json({ items: [D.restaurantCards[2]], nextCursor: null });
        return HttpResponse.json({ items: D.restaurantCards.slice(0, 2), nextCursor: 'p2' });
      }),
    );
    render(<RestaurantsScreen route={rRoute} />);
    const l = await list();
    await userEvent.click(await screen.findByRole('button', { name: 'نمایش رستوران‌های بیشتر' }));
    expect(await screen.findByText('بارگذاری ادامه‌ی لیست ناموفق بود.')).toBeInTheDocument();
    expect(cardNames(l)).toHaveLength(2);
    expect(top().screen).toBe('home');
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'نمایش رستوران‌های بیشتر' }));
    await waitFor(() => expect(cardNames(l)).toHaveLength(3));
  });

  it('no match → empty state; «حذف فیلترها» clears filters and category', async () => {
    useDiscovery.setState({
      category: 'cafe',
      applied: { ...useDiscovery.getState().applied, openNow: true },
    });
    render(<RestaurantsScreen route={rRoute} />);
    expect(await screen.findByRole('heading', { name: 'رستورانی پیدا نشد' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'حذف فیلترها' }));
    await waitFor(async () => expect(cardNames(await list())).toHaveLength(3));
    expect(useDiscovery.getState().category).toBe('all');
  });

  it('business error → inline ErrorState with retry', async () => {
    let fail = true;
    server.use(
      http.get('*/v1/restaurants', () =>
        fail ? HttpResponse.json({ code: 'X', message: 'x' }, { status: 400 }) : undefined,
      ),
    );
    render(<RestaurantsScreen route={rRoute} />);
    const retry = await screen.findByRole('button', { name: 'تلاش دوباره' });
    fail = false;
    await userEvent.click(retry);
    await list();
  });

  it('5xx → full-page error; offline → offline page', async () => {
    server.use(http.get('*/v1/restaurants', () => HttpResponse.json({}, { status: 500 })));
    const { unmount } = render(<RestaurantsScreen route={rRoute} />);
    await waitFor(() => expect(top()).toMatchObject({ screen: 'error', params: { kind: 'e500' } }));
    unmount();
    server.resetHandlers();
    useNav.getState().resetTo('home');
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    render(<RestaurantsScreen route={rRoute} />);
    await waitFor(() => expect(top()).toMatchObject({ screen: 'error', params: { kind: 'offline' } }));
    vi.restoreAllMocks();
  });

  it('categories failing hides the chips but still lists restaurants', async () => {
    server.use(http.get('*/v1/home', () => HttpResponse.json({}, { status: 500 })));
    render(<RestaurantsScreen route={rRoute} />);
    await waitFor(async () => expect(cardNames(await list())).toHaveLength(3));
    expect(screen.queryByRole('navigation', { name: 'دسته‌بندی‌ها' })).toBeNull();
    expect(top().screen).toBe('home');
  });

  it('favorite as a guest asks to log in', async () => {
    render(<RestaurantsScreen route={rRoute} />);
    await list();
    await userEvent.click(screen.getByRole('button', { name: 'افزودن برگر لاین به علاقه‌مندی‌ها' }));
    expect(top().screen).toBe('login');
  });
});

describe('<OffersScreen /> — spec §2 offers tab', () => {
  const ready = () => screen.findByRole('region', { name: 'کدهای تخفیف' });

  it('promo codes, discounted restaurants and campaigns (guest, D-59)', async () => {
    render(<OffersScreen route={oRoute} />);
    expect(screen.getByRole('status', { name: 'در حال بارگذاری' })).toBeInTheDocument();
    const codes = await ready();
    expect(screen.getByRole('heading', { level: 1, name: 'تخفیف‌ها' })).toBeInTheDocument();
    expect(within(codes).getByRole('button', { name: 'استفاده کد DOKOON10' })).toBeInTheDocument();
    const rests = screen.getByRole('region', { name: 'رستوران‌های تخفیف‌دار' });
    expect(cardNames(rests)).toEqual(['کباب‌سرای نقش‌جهان', 'برگر لاین']);
    const camps = screen.getByRole('region', { name: 'کمپین‌ها' });
    expect(within(camps).getAllByRole('button')).toHaveLength(D.campaigns.length);
  });

  it('a campaign row opens the campaign screen', async () => {
    render(<OffersScreen route={oRoute} />);
    await ready();
    const camps = screen.getByRole('region', { name: 'کمپین‌ها' });
    await userEvent.click(within(camps).getByRole('button', { name: /برگر و پیتزای داغ/ }));
    expect(top()).toMatchObject({ screen: 'campaign', params: { campaignId: 'b2' } });
  });

  it('using a code applies it to a non-empty cart', async () => {
    useCart.setState({ lines: [{ foodId: 'n1', qty: 1 } as never] });
    render(<OffersScreen route={oRoute} />);
    await ready();
    await userEvent.click(screen.getByRole('button', { name: 'استفاده کد FIRST20' }));
    expect(useCart.getState().promoCode).toBe('FIRST20');
  });

  it('a discounted restaurant opens the restaurant', async () => {
    render(<OffersScreen route={oRoute} />);
    await ready();
    const rests = screen.getByRole('region', { name: 'رستوران‌های تخفیف‌دار' });
    await userEvent.click(within(rests).getByRole('button', { name: /^برگر لاین$/ }));
    expect(top()).toMatchObject({ screen: 'restaurant', params: { restaurantId: 'burger' } });
  });

  it('nothing at all → empty state; empty sections are hidden', async () => {
    server.use(
      http.get('*/v1/promos', () => HttpResponse.json([])),
      http.get('*/v1/campaigns', () => HttpResponse.json([])),
      http.get('*/v1/restaurants', () => HttpResponse.json({ items: [], nextCursor: null })),
    );
    render(<OffersScreen route={oRoute} />);
    expect(await screen.findByRole('heading', { name: 'فعلاً تخفیفی نیست' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'کدهای تخفیف' })).toBeNull();
  });

  it('error → inline retry; offline → offline page', async () => {
    let fail = true;
    server.use(
      http.get('*/v1/campaigns', () =>
        fail ? HttpResponse.json({ code: 'X', message: 'x' }, { status: 400 }) : undefined,
      ),
    );
    const { unmount } = render(<OffersScreen route={oRoute} />);
    const retry = await screen.findByRole('button', { name: 'تلاش دوباره' });
    fail = false;
    await userEvent.click(retry);
    await ready();
    unmount();
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    render(<OffersScreen route={oRoute} />);
    await waitFor(() => expect(top()).toMatchObject({ screen: 'error', params: { kind: 'offline' } }));
    vi.restoreAllMocks();
  });
});

describe('<CampaignScreen /> — spec §2 campaign', () => {
  it('banner, text and participating restaurants; a card opens the restaurant; back', async () => {
    useNav.getState().push('campaign', { campaignId: 'b3' });
    render(<CampaignScreen route={cRoute('b3')} />);
    expect(screen.getByRole('status', { name: 'در حال بارگذاری' })).toBeInTheDocument();
    const camp = D.campaigns.find((c) => c.id === 'b3')!;
    expect(await screen.findByRole('heading', { level: 1, name: camp.title })).toBeInTheDocument();
    expect(screen.getByText(camp.text!)).toBeInTheDocument();
    const rests = screen.getByRole('region', { name: 'رستوران‌های این کمپین' });
    expect(cardNames(rests)).toEqual(
      camp.restaurantIds!.map((id) => D.restaurantCards.find((r) => r.id === id)!.name),
    );
    await userEvent.click(within(rests).getByRole('button', { name: /^برگر لاین$/ }));
    expect(top()).toMatchObject({ screen: 'restaurant', params: { restaurantId: 'burger' } });
    useNav.getState().back();
    await userEvent.click(screen.getByRole('button', { name: 'بازگشت' }));
    expect(top().screen).toBe('home');
  });

  it('unknown campaign → 404 error page', async () => {
    render(<CampaignScreen route={cRoute('nope')} />);
    await waitFor(() => expect(top()).toMatchObject({ screen: 'error', params: { kind: 'e404' } }));
  });

  it('a participant that fails to load is skipped; none → empty note', async () => {
    server.use(http.get('*/v1/restaurants/:id', () => HttpResponse.json({}, { status: 404 })));
    render(<CampaignScreen route={cRoute('b3')} />);
    expect(
      await screen.findByRole('heading', { name: 'رستوران‌های این کمپین فعلاً در دسترس نیستند' }),
    ).toBeInTheDocument();
    expect(top().screen).toBe('home');
  });

  it('offline → offline page', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    render(<CampaignScreen route={cRoute('b1')} />);
    await waitFor(() => expect(top()).toMatchObject({ screen: 'error', params: { kind: 'offline' } }));
    vi.restoreAllMocks();
  });
});
