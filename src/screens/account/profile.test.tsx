import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { OverlayHost } from '@/app/OverlayHost';
import { useSession } from '@/auth/session';
import { useAddresses } from '@/features/addresses';
import { useFavorites } from '@/features/favorites';
import { server } from '@/mocks/node';
import { useNav } from '@/nav/nav';
import type { Route, ScreenId } from '@/nav/types';
import { useToast } from '@/ui/toast';
import { AddressesScreen } from './AddressesScreen';
import { EditProfileScreen } from './EditProfileScreen';
import { FavoritesScreen } from './FavoritesScreen';

const nav = () => useNav.getState();
const top = () => nav().stack.at(-1)!;
const open = (screen: ScreenId): Route => {
  nav().push(screen);
  return top();
};
const HOME = {
  title: 'خانه',
  fullText: 'شهرضا، خیابان امام، کوچه‌ی ۱۲',
  location: { lat: 32.0089, lng: 51.8668 },
  recipientName: 'امیر',
  recipientPhone: '09131234567',
};

beforeEach(() => {
  useSession.getState().clear();
  useSession.getState().setSession({
    accessToken: 'a',
    refreshToken: 'r',
    user: { id: 'u1', phone: '09131234567', name: 'امیر' },
  });
  useAddresses.getState().clear();
  useFavorites.getState().clear();
  nav().resetTo('account');
});

describe('<EditProfileScreen /> — spec §6 editprof', () => {
  it('name is editable (min 2 letters); mobile is read-only; save → PATCH /me → back', async () => {
    let body: unknown;
    server.use(
      http.patch('*/v1/me', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ name: 'امیر رضایی' });
      }),
    );
    render(<EditProfileScreen route={open('editprof')} />);
    const name = screen.getByLabelText('نام و نام خانوادگی');
    expect(name).toHaveValue('امیر');
    expect(screen.getByLabelText('شماره موبایل')).toHaveAttribute('readonly');
    await userEvent.clear(name);
    await userEvent.type(name, 'ا');
    expect(screen.getByRole('button', { name: 'ذخیره' })).toBeDisabled();
    await userEvent.type(name, 'میر رضایی');
    await userEvent.click(screen.getByRole('button', { name: 'ذخیره' }));
    await waitFor(() => expect(top().screen).toBe('account'));
    expect(body).toEqual({ name: 'امیر رضایی' });
    expect(useSession.getState().user?.name).toBe('امیر رضایی');
    expect(useToast.getState().toasts[0]?.text).toBe('پروفایل ذخیره شد');
  });

  it('server error keeps the form with a message', async () => {
    server.use(
      http.patch('*/v1/me', () =>
        HttpResponse.json({ code: 'X', message: 'نام معتبر نیست' }, { status: 400 }),
      ),
    );
    render(<EditProfileScreen route={open('editprof')} />);
    await userEvent.type(screen.getByLabelText('نام و نام خانوادگی'), ' جان');
    await userEvent.click(screen.getByRole('button', { name: 'ذخیره' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('نام معتبر نیست');
    expect(top().screen).toBe('editprof');
  });
});

describe('<AddressesScreen /> — spec §6 addresses', () => {
  it('empty → EmptyState; «افزودن آدرس جدید» → addaddr', async () => {
    render(<AddressesScreen route={open('addresses')} />);
    expect(await screen.findByRole('heading', { name: 'هنوز آدرسی ثبت نکرده‌اید' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'افزودن آدرس جدید' }));
    expect(top().screen).toBe('addaddr');
  });

  it('lists addresses; delete asks first, then removes it', async () => {
    await useAddresses.getState().add(HOME);
    await useAddresses.getState().add({ ...HOME, title: 'محل کار', fullText: 'بلوار مطهری' });
    render(
      <>
        <AddressesScreen route={open('addresses')} />
        <OverlayHost />
      </>,
    );
    const list = await screen.findByRole('list', { name: 'آدرس‌های من' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    await userEvent.click(within(list).getByRole('button', { name: 'حذف محل کار' }));
    const dlg = screen.getByRole('alertdialog', { name: 'آدرس «محل کار» حذف شود؟' });
    await userEvent.click(within(dlg).getByRole('button', { name: 'حذف آدرس' }));
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(1));
    expect(list).not.toHaveTextContent('بلوار مطهری');
  });
});

describe('<FavoritesScreen /> — spec §6 favs', () => {
  it('lists favorite restaurants; tap → restaurant; heart removes it', async () => {
    render(<FavoritesScreen route={open('favs')} />);
    const card = await screen.findByRole('button', { name: 'کباب‌سرای نقش‌جهان' });
    await userEvent.click(screen.getByRole('button', { name: 'حذف کباب‌سرای نقش‌جهان از علاقه‌مندی‌ها' }));
    expect(
      await screen.findByRole('heading', { name: 'هنوز رستورانی را نشان نکرده‌اید' }),
    ).toBeInTheDocument();
    expect(card).not.toBeInTheDocument();
  });

  it('tap a favorite → its restaurant page', async () => {
    render(<FavoritesScreen route={open('favs')} />);
    await userEvent.click(await screen.findByRole('button', { name: 'کباب‌سرای نقش‌جهان' }));
    expect(top()).toMatchObject({ screen: 'restaurant', params: { restaurantId: 'naghsh' } });
  });
});
