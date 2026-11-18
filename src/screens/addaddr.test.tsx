import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSession } from '@/auth/session';
import { useAddresses } from '@/features/addresses';
import { server } from '@/mocks/node';
import { useNav } from '@/nav/nav';
import type { Route } from '@/nav/types';
import { AddAddressScreen } from './AddAddressScreen';
import { OverlayHost } from '@/app/OverlayHost';

const route: Route = { key: 'addaddr', screen: 'addaddr', params: {} };
const nav = () => useNav.getState();
const top = () => nav().stack.at(-1)!;

function stubGeo(lat: number, lng: number) {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (ok: (p: { coords: { latitude: number; longitude: number } }) => void) =>
        ok({ coords: { latitude: lat, longitude: lng } }),
    },
  });
}

beforeEach(() => {
  useSession.getState().clear();
  useSession.getState().setSession({
    accessToken: 'a',
    refreshToken: 'r',
    user: { id: 'u1', phone: '09131234567', name: 'امیر' },
  });
  useAddresses.getState().clear();
  nav().resetTo('cart');
  nav().push('checkout');
  nav().push('addaddr');
});
afterEach(() => {
  vi.restoreAllMocks();
});

async function fill() {
  await userEvent.type(screen.getByLabelText('آدرس کامل'), 'خیابان امام، کوچه‌ی ۱۲');
  await userEvent.type(screen.getByLabelText('پلاک'), '۸');
}

describe('<AddAddressScreen /> — spec §3 addaddr', () => {
  it('the user picks the map provider (Neshan or Balad); the choice is remembered', async () => {
    render(<AddAddressScreen route={route} />);
    const maps = screen.getByRole('radiogroup', { name: 'سرویس نقشه' });
    expect(within(maps).getByRole('radio', { name: 'نشان' })).toBeChecked();
    await userEvent.click(within(maps).getByRole('radio', { name: 'بلد' }));
    expect(within(maps).getByRole('radio', { name: 'بلد' })).toBeChecked();
    expect(localStorage.getItem('dk-map')).toBe('"balad"');
  });

  it('recipient defaults to the logged-in user; save posts coordinates and returns to checkout', async () => {
    let body: Record<string, unknown> = {};
    server.use(
      http.post('*/v1/addresses', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...body, id: 'a7', inZone: true }, { status: 201 });
      }),
    );
    render(<AddAddressScreen route={route} />);
    expect(screen.getByLabelText('نام گیرنده')).toHaveValue('امیر');
    expect(screen.getByLabelText('موبایل گیرنده')).toHaveValue('۰۹۱۳۱۲۳۴۵۶۷');
    await fill();
    const save = screen.getByRole('button', { name: 'ذخیره‌ی آدرس' });
    await waitFor(() => expect(save).toBeEnabled());
    await userEvent.click(save);
    await waitFor(() => expect(top().screen).toBe('checkout'));
    expect(body).toMatchObject({
      title: 'خانه',
      fullText: 'خیابان امام، کوچه‌ی ۱۲',
      plaque: '8',
      recipientName: 'امیر',
      recipientPhone: '09131234567',
    });
    expect(body.location).toEqual({ lat: expect.any(Number), lng: expect.any(Number) });
    expect(useAddresses.getState().selectedId).toBe('a7');
  });

  it('«موقعیت من» outside the service zone → message, save disabled', async () => {
    stubGeo(35.7, 51.4);
    render(<AddAddressScreen route={route} />);
    await fill();
    await userEvent.click(screen.getByRole('button', { name: 'موقعیت فعلی من' }));
    expect(await screen.findByText('این نقطه خارج از محدوده‌ی ارسال است')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ذخیره‌ی آدرس' })).toBeDisabled();
    stubGeo(32.0089, 51.8668);
    await userEvent.click(screen.getByRole('button', { name: 'موقعیت فعلی من' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'ذخیره‌ی آدرس' })).toBeEnabled());
  });

  it('title chips: «محل کار»', async () => {
    let body: Record<string, unknown> = {};
    server.use(
      http.post('*/v1/addresses', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...body, id: 'a8' }, { status: 201 });
      }),
    );
    render(<AddAddressScreen route={route} />);
    await userEvent.click(screen.getByRole('button', { name: 'محل کار' }));
    await fill();
    await userEvent.click(screen.getByRole('button', { name: 'ذخیره‌ی آدرس' }));
    await waitFor(() => expect(body.title).toBe('محل کار'));
  });

  it('server rejection (422) keeps the form with the message', async () => {
    server.use(
      http.post('*/v1/addresses', () =>
        HttpResponse.json({ code: 'OUT_OF_ZONE', message: 'خارج از محدوده' }, { status: 422 }),
      ),
    );
    render(<AddAddressScreen route={route} />);
    await fill();
    const save = screen.getByRole('button', { name: 'ذخیره‌ی آدرس' });
    await waitFor(() => expect(save).toBeEnabled());
    await userEvent.click(save);
    expect(await screen.findByRole('alert')).toHaveTextContent('خارج از محدوده');
    expect(top().screen).toBe('addaddr');
  });
});

describe('address sheet (overlay address)', () => {
  it('lists saved addresses; picking one selects it; «افزودن آدرس جدید» → addaddr', async () => {
    await useAddresses.getState().add({
      title: 'خانه',
      fullText: 'الف',
      location: { lat: 32.0089, lng: 51.8668 },
      recipientName: 'امیر',
      recipientPhone: '09131234567',
    });
    await useAddresses.getState().add({
      title: 'محل کار',
      fullText: 'ب',
      location: { lat: 32.0089, lng: 51.8668 },
      recipientName: 'امیر',
      recipientPhone: '09131234567',
    });
    nav().back();
    nav().openOverlay({ kind: 'address' });
    render(<OverlayHost />);
    const sheet = screen.getByRole('dialog', { name: 'انتخاب آدرس تحویل' });
    await userEvent.click(within(sheet).getByRole('radio', { name: 'خانه' }));
    expect(useAddresses.getState().selectedId).toBe('a1');
    expect(nav().overlay).toBeNull();
    nav().openOverlay({ kind: 'address' });
    await userEvent.click((await screen.findAllByRole('button', { name: 'افزودن آدرس جدید' }))[0]);
    expect(top().screen).toBe('addaddr');
  });
});
