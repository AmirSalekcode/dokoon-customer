import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/node';
import { useToast } from '@/ui/toast';
import { CourierApp } from '../CourierApp';
import { useCourierSession } from '../api/session';
import type { ActiveOrder, Offer } from '../api/types';
import { createCourierMockStream, type CourierMockStream } from '../mocks/stream';
import { useCourierNav } from '../nav/nav';
import { setPermissionProvider, webPermissionProvider } from '../permissions/provider';
import { setCourierSocketFactory, useCourierLive } from '../realtime/live';
import { useActiveOrder } from '../state/active';
import { useOffers } from '../state/offers';
import { setGeoSource, useOnline } from '../state/online';
import { allGranted } from '../test/permissions';
import { ALERT_MSG, alertView } from './OfferAlertOverlay';
import { createOfferSound, setOfferSound, type OfferSoundDeps } from './sound';

// KAN-95 (CP-11): full-screen offer alert — server-timed countdown, sound after the online tap, atomic
// accept (409 = another courier / time up), reject, back.
const nav = () => useCourierNav.getState();
const top = () => document.querySelector<HTMLElement>('main:not([hidden])')!;
const sw = () => within(top()).getByRole('switch');
const cards = () => within(top()).queryAllByRole('button', { name: /کیلومتر/ });
const dialog = () => screen.queryByRole('alertdialog');
const toasts = () => useToast.getState().toasts.map((t) => t.text);
const later = (ms: number) => new Date(Date.now() + ms).toISOString();

const offer = (id: string, rest: string, ms = 30_000): Offer => ({
  id,
  rest,
  fromArea: 'خیابان طالقانی',
  toArea: 'کوی ولیعصر',
  km: 2.4,
  kmToRest: 0.8,
  minutes: 12,
  earn: 68000,
  cash: true,
  expiresAt: later(ms),
});
const ORDER: ActiveOrder = {
  id: 'ord-of1',
  no: 4821,
  stage: 'toRest',
  rest: 'پیتزا پاتوق',
  restAddress: 'خیابان طالقانی، پلاک ۱۲',
  cust: 'سارا',
  custAddress: 'کوی ولیعصر، کوچه ۸',
  custPhone: '09120000000',
  cash: true,
  due: 420000,
  earn: 68000,
};

let stream: CourierMockStream;
let acceptReply: () => Response;
let rejected: string[];
let accepted: string[];
let sound: ReturnType<typeof createOfferSound>;

beforeEach(() => {
  rejected = [];
  accepted = [];
  acceptReply = () => HttpResponse.json(ORDER);
  server.use(
    http.put('*/v1/c/status', async ({ request }) => HttpResponse.json(await request.json())),
    http.post('*/v1/c/location', () => new HttpResponse(null, { status: 204 })),
    http.get('*/v1/c/offers', () =>
      HttpResponse.json([offer('of1', 'پیتزا پاتوق'), offer('of2', 'کباب‌سرای نقش', 45_000)]),
    ),
    http.get('*/v1/c/orders/active', () => new HttpResponse(null, { status: 204 })),
    http.post('*/v1/c/offers/:id/accept', ({ params }) => {
      accepted.push(String(params.id));
      return acceptReply();
    }),
    http.post('*/v1/c/offers/:id/reject', ({ params }) => {
      rejected.push(String(params.id));
      return new HttpResponse(null, { status: 204 });
    }),
  );
  stream = createCourierMockStream();
  setCourierSocketFactory(stream.connect);
  setGeoSource({ watch: () => () => {} });
  sound = createOfferSound({
    createContext: () => null,
    vibrate: () => {},
    setTimer: () => 0,
    clearTimer: () => {},
  });
  setOfferSound(sound);
  useOnline.getState().reset();
  useOffers.getState().clear();
  useActiveOrder.getState().clear();
  useToast.setState({ toasts: [] });
  useCourierSession.getState().setSession({ status: 'approved', name: 'مهدی کریمی' });
  setPermissionProvider(allGranted());
  act(() => nav().resetTo('orders'));
});
afterEach(() => {
  useOnline.getState().reset();
  stream.stop();
  setGeoSource(undefined);
  setOfferSound(null);
  setPermissionProvider(webPermissionProvider);
});

async function online() {
  render(<CourierApp />);
  await userEvent.click(sw());
  await waitFor(() => expect(useCourierLive.getState().status).toBe('open'));
  await waitFor(() => expect(cards()).toHaveLength(2));
}
async function openFirst() {
  await online();
  await userEvent.click(cards()[0]);
  return screen.findByRole('alertdialog', { name: 'سفارش جدید برای شما' });
}

describe('opening', () => {
  it('a card tap opens the alert: neighbourhoods, earnings, distances, seconds left, sound', async () => {
    const d = await openFirst();
    expect(d).toHaveTextContent('پیتزا پاتوق');
    expect(d).toHaveTextContent('۶۸٬۰۰۰ تومان');
    expect(d).toHaveTextContent('۰٫۸ کیلومتر تا شما');
    expect(d).toHaveTextContent('۲٫۴ کیلومتر مسیر');
    expect(d).toHaveTextContent('نقدی');
    expect(d).not.toHaveTextContent('پلاک');
    expect(within(d).getByRole('timer').getAttribute('aria-label')).toMatch(/^(۳۰|۲۹) ثانیه/);
    expect(sound.ringing).toBe(true);
    expect(within(d).getByRole('button', { name: 'قبول سفارش' })).toBeEnabled();
  });

  it('a live offer opens the alert by itself; not over an open dialog', async () => {
    await online();
    act(() => stream.emit({ event: 'offer.created', data: offer('of3', 'آش رشته‌ی حاجی') }));
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('آش رشته‌ی حاجی');
    act(() => nav().closeOverlay());
    act(() =>
      nav().openOverlay({ kind: 'dlg', props: { title: 'x', text: 'y', confirmLabel: 'z', onConfirm: () => {} } }),
    );
    act(() => stream.emit({ event: 'offer.created', data: offer('of4', 'فلافل') }));
    expect(nav().overlay?.kind).toBe('dlg');
    expect(cards()).toHaveLength(4);
  });

  it('alert view text', () => {
    expect(alertView(offer('x', 'ر'))).toMatchObject({ d1: '۰٫۸ کیلومتر تا شما', dist: 'حدود ۱۲ دقیقه' });
  });
});

describe('answers', () => {
  it('accept: the order is yours — alert closes, order page, banner state, offers gone, silence', async () => {
    const d = await openFirst();
    await userEvent.click(within(d).getByRole('button', { name: 'قبول سفارش' }));
    await waitFor(() => expect(dialog()).toBeNull());
    expect(accepted).toEqual(['of1']);
    expect(nav().stack.map((r) => r.screen)).toEqual(['orders', 'order']);
    expect(useActiveOrder.getState().order?.id).toBe('ord-of1');
    expect(useOnline.getState().hasActive).toBe(true);
    expect(toasts()).toContain(ALERT_MSG.accepted);
    expect(sound.ringing).toBe(false);
    await waitFor(() => expect(useOffers.getState().list).toHaveLength(0));
  });

  it('accept → 409 taken: «پیک دیگری…», alert closes, the offer leaves the list', async () => {
    acceptReply = () => HttpResponse.json({ code: 'OFFER_TAKEN', message: 'x' }, { status: 409 });
    const d = await openFirst();
    await userEvent.click(within(d).getByRole('button', { name: 'قبول سفارش' }));
    await waitFor(() => expect(dialog()).toBeNull());
    expect(toasts()).toContain(ALERT_MSG.taken);
    expect(cards()).toHaveLength(1);
    expect(useOnline.getState().hasActive).toBe(false);
  });

  it('accept → 409 expired', async () => {
    acceptReply = () => HttpResponse.json({ code: 'OFFER_EXPIRED', message: 'x' }, { status: 409 });
    const d = await openFirst();
    await userEvent.click(within(d).getByRole('button', { name: 'قبول سفارش' }));
    await waitFor(() => expect(toasts()).toContain(ALERT_MSG.expired));
    expect(dialog()).toBeNull();
  });

  it('accept fails otherwise: the alert stays, the courier can try again', async () => {
    acceptReply = () => HttpResponse.json({ code: 'BAD', message: 'x' }, { status: 400 });
    const d = await openFirst();
    await userEvent.click(within(d).getByRole('button', { name: 'قبول سفارش' }));
    await waitFor(() => expect(toasts()).toContain(ALERT_MSG.failed));
    expect(within(d).getByRole('button', { name: 'قبول سفارش' })).toBeEnabled();
    expect(sound.ringing).toBe(true);
  });

  it('reject: POST reject, the alert closes and the offer leaves the list', async () => {
    const d = await openFirst();
    await userEvent.click(within(d).getByRole('button', { name: 'رد کردن' }));
    expect(dialog()).toBeNull();
    await waitFor(() => expect(rejected).toEqual(['of1']));
    expect(cards()).toHaveLength(1);
    expect(sound.ringing).toBe(false);
  });

  it('back hides the alert; the offer stays in the list', async () => {
    await openFirst();
    act(() => {
      nav().handleSystemBack();
    });
    expect(dialog()).toBeNull();
    expect(cards()).toHaveLength(2);
    expect(rejected).toEqual([]);
  });
});

describe('the offer goes away while open', () => {
  it('another courier takes it (live offer.gone): closes with the reason', async () => {
    await openFirst();
    act(() => stream.emit({ event: 'offer.gone', data: { offerId: 'of1', reason: 'taken' } }));
    await waitFor(() => expect(dialog()).toBeNull());
    expect(toasts()).toContain(ALERT_MSG.taken);
  });

  it('the server deadline passes: closes as expired', async () => {
    server.use(http.get('*/v1/c/offers', () => HttpResponse.json([offer('of1', 'پیتزا پاتوق', 1200)])));
    render(<CourierApp />);
    await userEvent.click(sw());
    await waitFor(() => expect(cards()).toHaveLength(1));
    await userEvent.click(cards()[0]);
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    await waitFor(() => expect(dialog()).toBeNull(), { timeout: 3000 });
    expect(toasts()).toContain(ALERT_MSG.expired);
  });
});

describe('sound', () => {
  function fakeDeps() {
    const started: number[] = [];
    let timers = 0;
    const ctx = {
      state: 'suspended',
      currentTime: 0,
      destination: {},
      resume: vi.fn(() => {
        ctx.state = 'running';
        return Promise.resolve();
      }),
      createGain: () => ({ gain: { value: 0 }, connect: () => {} }),
      createOscillator: () => ({
        type: '',
        frequency: { value: 0 },
        connect: () => {},
        start: (t = 0) => started.push(t),
        stop: () => {},
      }),
    };
    const vib: number[][] = [];
    const deps: OfferSoundDeps = {
      createContext: () => ctx,
      vibrate: (p) => vib.push(p),
      setTimer: () => ++timers,
      clearTimer: () => {},
    };
    return { deps, ctx, started, vib };
  }

  it('silent until unlocked by a tap; then beeps and vibrates until stopped', async () => {
    const { deps, ctx, started, vib } = fakeDeps();
    const s = createOfferSound(deps);
    s.start();
    expect(started).toHaveLength(0); // no context yet: nothing plays (vibration still helps)
    s.stop();
    s.unlock();
    await Promise.resolve();
    expect(ctx.resume).toHaveBeenCalled();
    s.start();
    expect(started).toHaveLength(2);
    expect(vib.length).toBeGreaterThan(0);
    s.stop();
    expect(s.ringing).toBe(false);
  });
});
