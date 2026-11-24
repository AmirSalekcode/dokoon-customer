import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { server } from '@/mocks/node';
import { useToast } from '@/ui/toast';
import { CourierApp } from '../../CourierApp';
import { useCourierSession } from '../../api/session';
import type { ActiveOrder, Offer } from '../../api/types';
import { createCourierMockStream, type CourierMockStream } from '../../mocks/stream';
import { useCourierNav } from '../../nav/nav';
import { offerView } from '../../offers/present';
import { setPermissionProvider, webPermissionProvider } from '../../permissions/provider';
import { LIVE_TIMING, setCourierSocketFactory, useCourierLive } from '../../realtime/live';
import { useActiveOrder } from '../../state/active';
import { useOffers } from '../../state/offers';
import { setGeoSource, useOnline } from '../../state/online';
import { allGranted } from '../../test/permissions';

// KAN-94 (CP-10): live offers (WS + `GET /c/offers` fallback), neighbourhoods only, empty / offline, and the
// «سفارش در جریان» banner from `GET /c/orders/active`.
const nav = () => useCourierNav.getState();
const top = () => document.querySelector<HTMLElement>('main:not([hidden])')!;
const sw = () => within(top()).getByRole('switch');
const cards = () => within(top()).queryAllByRole('button', { name: /کیلومتر/ });
const later = (ms: number) => new Date(Date.now() + ms).toISOString();

const offer = (id: string, rest: string, ms = 30_000): Offer => ({
  id,
  rest,
  fromArea: 'خیابان طالقانی',
  toArea: 'کوی ولیعصر',
  km: 2.4,
  kmToRest: 0.6,
  minutes: 12,
  earn: 68000,
  cash: true,
  expiresAt: later(ms),
});
const ACTIVE: ActiveOrder = {
  id: 'o-1',
  no: 4821,
  stage: 'toCust',
  rest: 'پیتزا پاتوق',
  restAddress: 'خیابان طالقانی، پلاک ۱۲',
  cust: 'سارا',
  custAddress: 'کوی ولیعصر، کوچه ۸، پلاک ۱۹',
  custPhone: '09120000000',
  cash: false,
  earn: 70000,
};

let stream: CourierMockStream;
let offersReply: () => Response;
let activeReply: () => Response;
let offerGets = 0;
const timing = { ...LIVE_TIMING };

beforeEach(() => {
  offerGets = 0;
  offersReply = () => HttpResponse.json([offer('of1', 'پیتزا پاتوق'), offer('of2', 'کباب‌سرای نقش', 45_000)]);
  activeReply = () => new HttpResponse(null, { status: 204 });
  server.use(
    http.put('*/v1/c/status', async ({ request }) => HttpResponse.json(await request.json())),
    http.post('*/v1/c/location', () => new HttpResponse(null, { status: 204 })),
    http.get('*/v1/c/offers', () => {
      offerGets += 1;
      return offersReply();
    }),
    http.get('*/v1/c/orders/active', () => activeReply()),
  );
  stream = createCourierMockStream();
  setCourierSocketFactory(stream.connect);
  setGeoSource({ watch: () => () => {} });
  Object.assign(LIVE_TIMING, { graceMs: 50, pollMs: 150 });
  useOnline.getState().reset();
  useOffers.getState().clear();
  useActiveOrder.getState().clear();
  useToast.setState({ toasts: [] });
  useCourierSession.getState().setSession({ status: 'approved', name: 'مهدی کریمی' });
  setPermissionProvider(allGranted());
  act(() => nav().resetTo('orders'));
});
afterEach(() => {
  Object.assign(LIVE_TIMING, timing);
  useOnline.getState().reset();
  stream.stop();
  setGeoSource(undefined);
  setPermissionProvider(webPermissionProvider);
});

async function goOnline() {
  render(<CourierApp />);
  await userEvent.click(sw());
  await waitFor(() => expect(sw()).toHaveAttribute('aria-checked', 'true'));
  await waitFor(() => expect(useCourierLive.getState().status).toBe('open'));
}

describe('offers list', () => {
  it('online: the offers from the server, soonest deadline first, neighbourhoods only', async () => {
    await goOnline();
    expect(await within(top()).findByRole('heading', { name: 'سفارش‌های نزدیک شما' })).toBeInTheDocument();
    expect(cards()).toHaveLength(2);
    expect(cards()[0]).toHaveTextContent('پیتزا پاتوق');
    expect(cards()[0]).toHaveTextContent('خیابان طالقانی');
    expect(cards()[0]).toHaveTextContent('۶۸٬۰۰۰ تومان');
    expect(cards()[0]).toHaveTextContent('نقدی');
    // Nothing that looks like an address or a phone.
    expect(top().textContent).not.toMatch(/پلاک|کوچه|09\d{9}|۰۹/);
  });

  it('offer view text is formatted with Persian digits', () => {
    const v = offerView(offer('x', 'ر'));
    expect(v).toMatchObject({ dist: '۲٫۴ کیلومتر', time: '۱۲ دقیقه', pay: 'نقدی · دریافت از مشتری', cash: true });
  });

  it('live: offer.created adds a card, offer.gone (taken) removes it', async () => {
    await goOnline();
    await waitFor(() => expect(cards()).toHaveLength(2));
    act(() => stream.emit({ event: 'offer.created', data: offer('of3', 'آش رشته‌ی حاجی', 10_000) }));
    expect(cards()).toHaveLength(3);
    expect(cards()[0]).toHaveTextContent('آش رشته‌ی حاجی');
    act(() => stream.emit({ event: 'offer.gone', data: { offerId: 'of1', reason: 'taken' } }));
    expect(cards()).toHaveLength(2);
    expect(top()).not.toHaveTextContent('پیتزا پاتوق');
  });

  it('an offer leaves the list when its server deadline passes', async () => {
    offersReply = () => HttpResponse.json([offer('of1', 'پیتزا پاتوق', 800)]);
    await goOnline();
    await waitFor(() => expect(cards()).toHaveLength(1));
    await waitFor(() => expect(cards()).toHaveLength(0), { timeout: 3000 });
    expect(within(top()).getByText('منتظر سفارش باشید')).toBeInTheDocument();
  });

  it('tapping a card opens the alert for that offer', async () => {
    await goOnline();
    await waitFor(() => expect(cards()).toHaveLength(2));
    await userEvent.click(cards()[1]);
    expect(nav().overlay).toMatchObject({ kind: 'alr', props: { offerId: 'of2' } });
  });

  it('no offers: «منتظر سفارش باشید»; a failed list: retry', async () => {
    offersReply = () => HttpResponse.json({ code: 'BAD', message: 'x' }, { status: 400 });
    await goOnline();
    expect(await within(top()).findByText('پیشنهادها دریافت نشد')).toBeInTheDocument();
    offersReply = () => HttpResponse.json([]);
    await userEvent.click(within(top()).getByRole('button', { name: 'تلاش دوباره' }));
    expect(await within(top()).findByText('منتظر سفارش باشید')).toBeInTheDocument();
  });

  it('offline: the socket closes and the list empties', async () => {
    await goOnline();
    await waitFor(() => expect(cards()).toHaveLength(2));
    await userEvent.click(sw());
    await waitFor(() => expect(sw()).toHaveAttribute('aria-checked', 'false'));
    expect(stream.connected).toBe(0);
    expect(useCourierLive.getState().status).toBe('idle');
    expect(cards()).toHaveLength(0);
    expect(within(top()).getByText('آفلاین هستید', { selector: 'h4' })).toBeInTheDocument();
  });
});

describe('connection', () => {
  it('lost: a line says so and the list is re-read; back: the line goes and the list syncs', async () => {
    await goOnline();
    await waitFor(() => expect(cards()).toHaveLength(2));
    act(() => stream.outage(true));
    expect(await within(top()).findByRole('alert')).toHaveTextContent('اتصال زنده قطع شده است');
    const before = offerGets;
    // Fallback: the list is fetched again while the socket is down.
    offersReply = () => HttpResponse.json([offer('of9', 'حلیم مش‌رجب')]);
    await waitFor(() => expect(offerGets).toBeGreaterThan(before));
    await waitFor(() => expect(cards()).toHaveLength(1));
    act(() => stream.outage(false));
    await waitFor(() => expect(useCourierLive.getState().status).toBe('open'), { timeout: 4000 });
    expect(within(top()).queryByRole('alert')).toBeNull();
    // New offers arrive over the socket again.
    act(() => stream.emit({ event: 'offer.created', data: offer('of10', 'فلافل') }));
    expect(cards()).toHaveLength(2);
  });
});

describe('active order banner', () => {
  it('an order in progress: banner instead of offers, tracking on, and it opens the order', async () => {
    activeReply = () => HttpResponse.json(ACTIVE);
    render(<CourierApp />);
    const banner = await within(top()).findByRole('button', { name: /سفارش در جریان/ });
    expect(banner).toHaveTextContent('پیتزا پاتوق · در راه مشتری');
    expect(useOnline.getState().hasActive).toBe(true);
    expect(within(top()).getByTestId('tracking')).toHaveTextContent('ردیابی فعال');
    expect(cards()).toHaveLength(0);
    // The customer's address is not on the orders tab.
    expect(top()).not.toHaveTextContent('کوچه');
    await userEvent.click(banner);
    expect(nav().stack.map((r) => r.screen)).toEqual(['orders', 'order']);
    expect(await screen.findByRole('heading', { name: 'سفارش #۴۸۲۱' })).toBeInTheDocument();
    act(() => nav().back());
    expect(nav().stack.map((r) => r.screen)).toEqual(['orders']);
  });

  it('order.cancelled removes the banner and warns; tracking stops when offline', async () => {
    activeReply = () => HttpResponse.json(ACTIVE);
    render(<CourierApp />);
    await within(top()).findByRole('button', { name: /سفارش در جریان/ });
    await waitFor(() => expect(useCourierLive.getState().status).toBe('open'));
    act(() => stream.emit({ event: 'order.cancelled', data: { orderId: 'o-1', reason: 'restaurant' } }));
    expect(within(top()).queryByRole('button', { name: /سفارش در جریان/ })).toBeNull();
    expect(useToast.getState().toasts.map((t) => t.text)).toContain('سفارش در جریان لغو شد');
    expect(useOnline.getState().tracking).toBe('off');
    await waitFor(() => expect(stream.connected).toBe(0));
  });

  it('order.updated moves the banner to the new stage', async () => {
    activeReply = () => HttpResponse.json({ ...ACTIVE, stage: 'toRest' });
    render(<CourierApp />);
    const banner = await within(top()).findByRole('button', { name: /سفارش در جریان/ });
    await waitFor(() => expect(useCourierLive.getState().status).toBe('open'));
    activeReply = () => HttpResponse.json({ ...ACTIVE, stage: 'pickup' });
    act(() => stream.emit({ event: 'order.updated', data: { ...ACTIVE, stage: 'pickup' } }));
    expect(banner).toHaveTextContent('تحویل‌گیری از رستوران');
  });
});
