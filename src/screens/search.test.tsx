import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSession } from '@/auth/session';
import { useDiscovery } from '@/features/discovery/filters';
import { RECENT_KEY, useSearch } from '@/features/discovery/search';
import { server } from '@/mocks/node';
import { useNav } from '@/nav/nav';
import type { Route } from '@/nav/types';
import { SearchScreen } from './SearchScreen';

const route: Route = { key: 'search', screen: 'search', params: {} };
const top = () => useNav.getState().stack.at(-1)!;
const box = () => screen.getByRole('searchbox', { name: 'رستوران یا غذا را جستجو کنید' });

beforeEach(() => {
  localStorage.clear();
  useSession.getState().clear();
  useDiscovery.getState().reset();
  useSearch.getState().reset();
  useNav.getState().resetTo('home');
  useNav.getState().push('search');
});

afterEach(() => vi.restoreAllMocks());

describe('<SearchScreen /> — spec §2 search', () => {
  it('idle: recent (from the server for a new device) and popular chips; works for guests', async () => {
    render(<SearchScreen route={route} />);
    expect(screen.getByRole('heading', { level: 1, name: 'جستجو' })).toBeInTheDocument();
    const recent = await screen.findByRole('region', { name: 'جستجوهای اخیر' });
    expect(within(recent).getByRole('button', { name: 'کباب' })).toBeInTheDocument();
    const popular = screen.getByRole('region', { name: 'جستجوهای محبوب' });
    expect(
      within(popular)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['کباب', 'پیتزا', 'برگر']);
    expect(top().screen).toBe('search');
  });

  it('typing searches after a debounce and shows restaurants and foods', async () => {
    const qs: string[] = [];
    server.events.on('request:start', ({ request }) => {
      const u = new URL(request.url);
      if (u.pathname.endsWith('/search')) qs.push(u.searchParams.get('q') ?? '');
    });
    render(<SearchScreen route={route} />);
    await userEvent.type(box(), 'برگر');
    const rests = await screen.findByRole('region', { name: 'رستوران‌ها' });
    expect(within(rests).getByRole('button', { name: /برگر لاین/ })).toBeInTheDocument();
    const foods = screen.getByRole('region', { name: 'غذاها' });
    expect(within(foods).getByRole('button', { name: /چیزبرگر دوبل/ })).toBeInTheDocument();
    // One request for the final text, not one per keystroke.
    expect(qs).toEqual(['برگر']);
    server.events.removeAllListeners();
  });

  it('normalizes Arabic letters before searching', async () => {
    render(<SearchScreen route={route} />);
    await userEvent.type(box(), 'كباب');
    const foods = await screen.findByRole('region', { name: 'غذاها' });
    expect(within(foods).getByRole('button', { name: /کباب برگ/ })).toBeInTheDocument();
  });

  it('a popular chip fills the box and searches', async () => {
    render(<SearchScreen route={route} />);
    const popular = await screen.findByRole('region', { name: 'جستجوهای محبوب' });
    await userEvent.click(within(popular).getByRole('button', { name: 'پیتزا' }));
    expect(box()).toHaveValue('پیتزا');
    expect(await screen.findByRole('region', { name: 'غذاها' })).toHaveTextContent('پیتزا پپرونی');
  });

  it('opening a restaurant remembers the query', async () => {
    render(<SearchScreen route={route} />);
    await userEvent.type(box(), 'برگر');
    const rests = await screen.findByRole('region', { name: 'رستوران‌ها' });
    await userEvent.click(within(rests).getByRole('button', { name: /برگر لاین/ }));
    expect(top()).toMatchObject({ screen: 'restaurant', params: { restaurantId: 'burger' } });
    expect(JSON.parse(localStorage.getItem(RECENT_KEY)!)).toEqual(['برگر', 'کباب']);
  });

  it('a food opens its restaurant with the food sheet', async () => {
    render(<SearchScreen route={route} />);
    await userEvent.type(box(), 'پپرونی');
    const foods = await screen.findByRole('region', { name: 'غذاها' });
    await userEvent.click(within(foods).getByRole('button', { name: /پیتزا پپرونی/ }));
    expect(top()).toMatchObject({ screen: 'restaurant', params: { restaurantId: 'burger' } });
    expect(useNav.getState().overlay).toMatchObject({
      kind: 'food',
      props: { foodId: 'b4', restaurantId: 'burger' },
    });
  });

  it('clearing recent searches hides the section', async () => {
    render(<SearchScreen route={route} />);
    const recent = await screen.findByRole('region', { name: 'جستجوهای اخیر' });
    await userEvent.click(within(recent).getByRole('button', { name: 'پاک کردن جستجوهای اخیر' }));
    expect(screen.queryByRole('region', { name: 'جستجوهای اخیر' })).toBeNull();
  });

  it('no result → empty state with a hint', async () => {
    render(<SearchScreen route={route} />);
    await userEvent.type(box(), 'سوشی');
    expect(await screen.findByRole('heading', { name: 'نتیجه‌ای پیدا نشد' })).toBeInTheDocument();
  });

  it('filters narrow the results; the filter button shows the count and opens the sheet', async () => {
    useDiscovery.setState({ applied: { ...useDiscovery.getState().applied, openNow: true } });
    render(<SearchScreen route={route} />);
    await userEvent.type(box(), 'کافه');
    expect(await screen.findByRole('heading', { name: 'نتیجه‌ای با این فیلترها نیست' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'حذف فیلترها' }));
    expect(await screen.findByRole('region', { name: 'رستوران‌ها' })).toHaveTextContent('کافه گلستان');
    useDiscovery.setState({ applied: { ...useDiscovery.getState().applied, hasDiscount: true } });
    await userEvent.click(await screen.findByRole('button', { name: 'فیلتر و مرتب‌سازی، ۱ فیلتر فعال' }));
    expect(useNav.getState().overlay?.kind).toBe('filter');
  });

  it('food-type filters are not applied to search and say so', async () => {
    useDiscovery.setState({ applied: { ...useDiscovery.getState().applied, tags: ['kebab'] } });
    render(<SearchScreen route={route} />);
    await userEvent.type(box(), 'برگر');
    await screen.findByRole('region', { name: 'رستوران‌ها' });
    expect(screen.getByRole('note')).toHaveTextContent('فیلتر نوع غذا در جستجو اعمال نمی‌شود');
  });

  it('keeps the query when the screen is shown again (back / reopen)', async () => {
    useSearch.getState().setQuery('برگر');
    render(<SearchScreen route={route} />);
    expect(box()).toHaveValue('برگر');
    expect(await screen.findByRole('region', { name: 'رستوران‌ها' })).toBeInTheDocument();
  });

  it('back returns to the previous screen', async () => {
    render(<SearchScreen route={route} />);
    await userEvent.click(screen.getByRole('button', { name: 'بازگشت' }));
    expect(top().screen).toBe('home');
  });

  it('search error → inline error with retry', async () => {
    let fail = true;
    server.use(
      http.get('*/v1/search', () =>
        fail ? HttpResponse.json({ code: 'X', message: 'x' }, { status: 400 }) : undefined,
      ),
    );
    render(<SearchScreen route={route} />);
    await userEvent.type(box(), 'برگر');
    const retry = await screen.findByRole('button', { name: 'تلاش دوباره' });
    fail = false;
    await userEvent.click(retry);
    expect(await screen.findByRole('region', { name: 'رستوران‌ها' })).toBeInTheDocument();
  });

  it('server 500 → full-page error', async () => {
    server.use(http.get('*/v1/search', () => HttpResponse.json({}, { status: 500 })));
    render(<SearchScreen route={route} />);
    await userEvent.type(box(), 'برگر');
    await waitFor(() => expect(top()).toMatchObject({ screen: 'error', params: { kind: 'e500' } }), {
      timeout: 4000,
    });
  });

  it('offline → offline error page', async () => {
    render(<SearchScreen route={route} />);
    await screen.findByRole('region', { name: 'جستجوهای محبوب' });
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    await userEvent.type(box(), 'برگر');
    await waitFor(() => expect(top()).toMatchObject({ screen: 'error', params: { kind: 'offline' } }));
  });

  it('suggestions failing does not block typing (no full-page error)', async () => {
    server.use(http.get('*/v1/search/suggestions', () => HttpResponse.json({}, { status: 500 })));
    render(<SearchScreen route={route} />);
    await userEvent.type(box(), 'برگر');
    expect(await screen.findByRole('region', { name: 'رستوران‌ها' })).toBeInTheDocument();
    expect(top().screen).toBe('search');
  });
});
