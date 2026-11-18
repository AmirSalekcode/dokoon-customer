import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { useLaunch } from '@/auth/flow';
import { useSession } from '@/auth/session';
import { useDiscovery } from '@/features/discovery/filters';
import { server } from '@/mocks/node';
import { useNav } from '@/nav/nav';
import type { Route } from '@/nav/types';
import { HomeScreen } from './HomeScreen';

const route: Route = { key: 'home', screen: 'home', params: {} };
const top = () => useNav.getState().stack.at(-1)!;

beforeEach(() => {
  localStorage.clear();
  useSession.getState().clear();
  useDiscovery.getState().reset();
  useLaunch.getState().setCity('shahreza');
  useNav.getState().resetTo('home');
});

const ready = () => screen.findByRole('heading', { name: 'نزدیک شما' });

describe('<HomeScreen /> — spec §2 Home', () => {
  it('loading skeleton first, then greeting, search, banners, categories and sections', async () => {
    render(<HomeScreen route={route} />);
    expect(screen.getByRole('status', { name: 'در حال بارگذاری' })).toBeInTheDocument();
    await ready();
    expect(screen.getByRole('heading', { name: 'سلام مهمان عزیز' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'دنبال چه رستوران یا غذایی؟' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'پیشنهادهای ویژه' })).toHaveTextContent(
      'کباب داغ، دم در خونه‌ات',
    );
    const cats = screen.getByRole('navigation', { name: 'دسته‌بندی‌ها' });
    expect(
      within(cats)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['همه', 'فست‌فود', 'ایرانی', 'کافه']);
    expect(screen.getByRole('heading', { name: 'محبوب‌ترین‌ها' })).toBeInTheDocument();
  });

  it('greets a logged-in user by name; the address chip shows the city for guests', async () => {
    useSession.getState().setSession({ accessToken: 'a', refreshToken: 'r', user: { name: 'سارا' } });
    render(<HomeScreen route={route} />);
    await ready();
    expect(screen.getByRole('heading', { name: 'سلام سارا عزیز' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /آدرس تحویل: شهرضا/ })).toBeInTheDocument();
  });

  it('search bar is tap-only and opens the search screen', async () => {
    render(<HomeScreen route={route} />);
    await ready();
    await userEvent.click(screen.getByRole('button', { name: 'دنبال چه رستوران یا غذایی؟' }));
    expect(top().screen).toBe('search');
  });

  it('a banner for one restaurant opens that restaurant', async () => {
    render(<HomeScreen route={route} />);
    await ready();
    const banner = screen.getByRole('group', { name: 'کباب داغ، دم در خونه‌ات' });
    await userEvent.click(within(banner).getByRole('button', { name: 'سفارش بده' }));
    expect(top()).toMatchObject({ screen: 'restaurant', params: { restaurantId: 'naghsh' } });
  });

  it('picking a category lists matching restaurants from GET /restaurants; «همه» restores sections', async () => {
    render(<HomeScreen route={route} />);
    await ready();
    await userEvent.click(screen.getByRole('button', { name: 'فست‌فود' }));
    const results = await screen.findByRole('region', { name: 'نتایج' });
    await waitFor(() =>
      expect(within(results).getAllByRole('button', { name: /^برگر لاین$/ })).toHaveLength(1),
    );
    expect(within(results).queryByRole('button', { name: /^کباب‌سرای نقش‌جهان$/ })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'نزدیک شما' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'همه' }));
    await ready();
  });

  it('no match → empty state with a way out', async () => {
    useDiscovery.setState({ applied: { ...useDiscovery.getState().applied, minRating: 5 } });
    render(<HomeScreen route={route} />);
    expect(await screen.findByRole('heading', { name: 'رستورانی پیدا نشد' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'حذف فیلترها' }));
    await ready();
  });

  it('error → inline error with retry', async () => {
    let fail = true;
    server.use(
      http.get('*/v1/home', () =>
        fail ? HttpResponse.json({ code: 'X', message: 'x' }, { status: 400 }) : undefined,
      ),
    );
    render(<HomeScreen route={route} />);
    const retry = await screen.findByRole('button', { name: 'تلاش دوباره' });
    fail = false;
    await userEvent.click(retry);
    await ready();
  });

  it('filter button shows the active-filter count and opens the filter sheet', async () => {
    useDiscovery.setState({
      applied: { ...useDiscovery.getState().applied, openNow: true, hasDiscount: true },
    });
    render(<HomeScreen route={route} />);
    const btn = await screen.findByRole('button', { name: 'فیلتر و مرتب‌سازی، ۲ فیلتر فعال' });
    await userEvent.click(btn);
    expect(useNav.getState().overlay?.kind).toBe('filter');
  });

  it('a guest has no favorites, even if the data says isFavorite', async () => {
    render(<HomeScreen route={route} />);
    await ready();
    expect(screen.queryAllByRole('button', { name: /^حذف .* از علاقه‌مندی‌ها$/ })).toHaveLength(0);
  });

  it('favorite as a guest asks to log in', async () => {
    render(<HomeScreen route={route} />);
    await ready();
    await userEvent.click(screen.getAllByRole('button', { name: 'افزودن برگر لاین به علاقه‌مندی‌ها' })[0]);
    expect(top().screen).toBe('login');
  });

  it('favorite when logged in calls PUT /favorites and flips the heart at once', async () => {
    const calls: string[] = [];
    server.use(
      http.put('*/v1/favorites/restaurants/:id', ({ params }) => {
        calls.push(`PUT ${params.id}`);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    useSession.getState().setSession({ accessToken: 'a', refreshToken: 'r', user: { name: 'سارا' } });
    render(<HomeScreen route={route} />);
    await ready();
    await userEvent.click(screen.getAllByRole('button', { name: 'افزودن برگر لاین به علاقه‌مندی‌ها' })[0]);
    expect(screen.getAllByRole('button', { name: 'حذف برگر لاین از علاقه‌مندی‌ها' }).length).toBeGreaterThan(
      0,
    );
    await waitFor(() => expect(calls).toEqual(['PUT burger']));
  });
});
