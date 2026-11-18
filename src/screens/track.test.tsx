import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/api/client';
import type { Order } from '@/api/types';
import { useSession } from '@/auth/session';
import { useCart } from '@/cart/cart';
import { useAddresses } from '@/features/addresses';
import { toDraft } from '@/features/checkout';
import { server } from '@/mocks/node';
import { useNav } from '@/nav/nav';
import type { Route } from '@/nav/types';
import { useToast } from '@/ui/toast';
import { CancelOrderScreen } from './order/CancelOrderScreen';
import { RateOrderScreen } from './order/RateOrderScreen';
import { ReportScreen } from './order/ReportScreen';
import { TrackScreen } from './order/TrackScreen';

const nav = () => useNav.getState();
const top = () => nav().stack.at(-1)!;
let orderId = '';

async function placeCashOrder() {
  useCart.getState().clear();
  useCart
    .getState()
    .add(
      { id: 'naghsh', name: 'کباب‌سرای نقش‌جهان' },
      { foodId: 'n2', title: 'کباب برگ', unitPrice: 420000, options: [] },
    );
  const a = await useAddresses.getState().add({
    title: 'خانه',
    fullText: 'شهرضا، خیابان امام، کوچه‌ی ۱۲',
    location: { lat: 32.0089, lng: 51.8668 },
    recipientName: 'امیر',
    recipientPhone: '09131234567',
  });
  if (!a.ok) throw new Error(a.message);
  useCart.getState().setNote('زنگ نزنید');
  const { data } = await api.POST('/orders', {
    params: { header: { 'Idempotency-Key': 'k' } },
    body: toDraft(useCart.getState(), { addressId: a.address.id, payMethod: 'cash' }),
  });
  orderId = data!.order!.id!;
}

/** Serve the order at a given step (as the server would after time passes). */
function serveAt(patch: Partial<Order>) {
  server.use(
    http.get(`*/v1/orders/${orderId}`, async () => {
      const { data } = await api.GET('/orders/{id}', { params: { path: { id: 'o1' } } });
      return HttpResponse.json({ ...data, id: orderId, ...patch });
    }),
  );
}

/** The real track route on the stack (its key decides whether the screen is on top and polls). */
const trackRoute = (): Route => nav().stack.find((r) => r.screen === 'track')!;

beforeEach(async () => {
  useSession.getState().setSession({ accessToken: 'a', refreshToken: 'r' });
  useAddresses.getState().clear();
  await placeCashOrder();
  nav().resetTo('home');
  nav().push('paid', { orderId });
  nav().push('track', { orderId });
});
afterEach(() => vi.useRealTimers());

describe('<TrackScreen /> — spec §4 track', () => {
  it('just placed: step 1 of 5 current, ETA, payment row, items, totals, cancel allowed', async () => {
    render(<TrackScreen route={trackRoute()} />);
    const steps = await screen.findByRole('list', { name: 'مراحل سفارش' });
    const items = within(steps).getAllByRole('listitem');
    expect(items.map((i) => i.textContent)).toEqual(
      expect.arrayContaining([expect.stringContaining('ثبت شد'), expect.stringContaining('تحویل شد')]),
    );
    expect(items[0]).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('status')).toHaveTextContent('سفارش ثبت شد');
    expect(screen.getByText('زمان تقریبی تحویل: ۲۵ تا ۳۵ دقیقه')).toBeInTheDocument();
    const info = screen.getByRole('region', { name: 'جزئیات سفارش' });
    expect(info).toHaveTextContent('نقدی هنگام تحویل');
    expect(info).toHaveTextContent('شهرضا، خیابان امام، کوچه‌ی ۱۲');
    expect(info).toHaveTextContent('زنگ نزنید');
    expect(screen.getByRole('region', { name: 'اقلام سفارش' })).toHaveTextContent('کباب برگ');
    expect(screen.getByRole('region', { name: 'اقلام سفارش' })).toHaveTextContent('۴۶۵٬۰۰۰ تومان');
    expect(screen.getByRole('button', { name: 'لغو سفارش' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'امتیاز به سفارش' })).toBeNull();
  });

  it('contact rows: restaurant always; courier only once on the way', async () => {
    render(<TrackScreen route={trackRoute()} />);
    expect(await screen.findByRole('link', { name: 'تماس با کباب‌سرای نقش‌جهان' })).toHaveAttribute(
      'href',
      'tel:03100000001',
    );
    expect(screen.queryByRole('link', { name: /تماس با پیک/ })).toBeNull();
  });

  it('on the way: courier contact, no cancel', async () => {
    serveAt({
      status: 'ON_THE_WAY',
      step: 3,
      courier: { name: 'رضا محمدی', phone: '09130000000' },
      canCancel: false,
    });
    render(<TrackScreen route={trackRoute()} />);
    expect(await screen.findByRole('link', { name: 'تماس با پیک: رضا محمدی' })).toHaveAttribute(
      'href',
      'tel:09130000000',
    );
    expect(screen.getByRole('status')).toHaveTextContent('در راه');
    expect(screen.queryByRole('button', { name: 'لغو سفارش' })).toBeNull();
  });

  it('delivered: rate button; no ETA', async () => {
    serveAt({ status: 'DELIVERED', step: 4, canCancel: false, canRate: true });
    render(<TrackScreen route={trackRoute()} />);
    await userEvent.click(await screen.findByRole('button', { name: 'امتیاز به سفارش' }));
    expect(top()).toMatchObject({ screen: 'rateorder', params: { orderId } });
    expect(screen.queryByText(/زمان تقریبی تحویل/)).toBeNull();
  });

  it('canceled: «سفارش لغو شد», no steps', async () => {
    serveAt({ status: 'CANCELED_BY_CUSTOMER', canCancel: false });
    render(<TrackScreen route={trackRoute()} />);
    expect(await screen.findByText('سفارش لغو شد')).toHaveAttribute('role', 'status');
    expect(screen.queryByRole('list', { name: 'مراحل سفارش' })).toBeNull();
  });

  it('polls the server every 15s and updates the status', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<TrackScreen route={trackRoute()} />);
    await screen.findByRole('list', { name: 'مراحل سفارش' });
    serveAt({ status: 'PREPARING', step: 2, canCancel: false });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('در حال آماده‌سازی'));
  });

  it('«گزارش مشکل» → report', async () => {
    render(<TrackScreen route={trackRoute()} />);
    await userEvent.click(await screen.findByRole('button', { name: 'گزارش مشکل' }));
    expect(top()).toMatchObject({ screen: 'report', params: { orderId } });
  });

  it('back from track returns to the exact previous screen', async () => {
    render(<TrackScreen route={trackRoute()} />);
    await userEvent.click(await screen.findByRole('button', { name: 'بازگشت' }));
    expect(top().screen).toBe('paid');
  });

  it('unknown order → 404 page', async () => {
    render(<TrackScreen route={{ key: 't', screen: 'track', params: { orderId: 'zzz' } }} />);
    await waitFor(() => expect(top()).toMatchObject({ screen: 'error', params: { kind: 'e404' } }));
  });
});

describe('<CancelOrderScreen /> — spec §4 cancel', () => {
  const route = (): Route => ({ key: 'c', screen: 'cancel', params: { orderId } });
  beforeEach(() => nav().push('cancel', { orderId }));

  it('needs a reason; confirming cancels and returns to track', async () => {
    let body: unknown;
    server.use(
      http.post(`*/v1/orders/${orderId}/cancel`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({});
      }),
    );
    render(<CancelOrderScreen route={route()} />);
    const confirm = screen.getByRole('button', { name: 'تأیید لغو سفارش' });
    expect(confirm).toBeDisabled();
    await userEvent.click(screen.getByRole('radio', { name: 'زمان تحویل طولانی است' }));
    await userEvent.click(confirm);
    await waitFor(() => expect(top().screen).toBe('track'));
    expect(body).toEqual({ reasonId: 'too_slow' });
    expect(useToast.getState().toasts[0]?.text).toBe('سفارش لغو شد');
  });

  it('«سایر» asks for a short explanation', async () => {
    render(<CancelOrderScreen route={route()} />);
    await userEvent.click(screen.getByRole('radio', { name: 'سایر' }));
    expect(screen.getByRole('button', { name: 'تأیید لغو سفارش' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText('توضیح'), 'منصرف شدم');
    expect(screen.getByRole('button', { name: 'تأیید لغو سفارش' })).toBeEnabled();
  });

  it('409 (restaurant already accepted) → message, stays', async () => {
    server.use(
      http.post(`*/v1/orders/${orderId}/cancel`, () =>
        HttpResponse.json(
          { code: 'NOT_CANCELABLE', message: 'رستوران سفارش را پذیرفته است' },
          { status: 409 },
        ),
      ),
    );
    render(<CancelOrderScreen route={route()} />);
    await userEvent.click(screen.getByRole('radio', { name: 'اشتباه سفارش دادم' }));
    await userEvent.click(screen.getByRole('button', { name: 'تأیید لغو سفارش' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('رستوران سفارش را پذیرفته است');
    expect(top().screen).toBe('cancel');
  });
});

describe('<ReportScreen /> — spec §4 report', () => {
  it('type + text required → «ثبت شد» → back to track', async () => {
    nav().push('report', { orderId });
    render(<ReportScreen route={{ key: 'r', screen: 'report', params: { orderId } }} />);
    const send = screen.getByRole('button', { name: 'ثبت گزارش' });
    expect(send).toBeDisabled();
    await userEvent.click(screen.getByRole('radio', { name: 'تأخیر در تحویل' }));
    await userEvent.type(screen.getByLabelText('توضیح مشکل'), 'یک ساعت دیر رسید');
    await userEvent.click(send);
    await waitFor(() => expect(top().screen).toBe('track'));
    expect(useToast.getState().toasts[0]?.text).toBe('گزارش شما ثبت شد');
  });
});

describe('<RateOrderScreen /> — spec §4 rateorder', () => {
  it('restaurant stars required, courier optional → posted → track', async () => {
    let body: unknown;
    server.use(
      http.post(`*/v1/orders/${orderId}/rating`, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 201 });
      }),
    );
    nav().push('rateorder', { orderId });
    render(<RateOrderScreen route={{ key: 'ro', screen: 'rateorder', params: { orderId } }} />);
    const send = screen.getByRole('button', { name: 'ثبت امتیاز' });
    expect(send).toBeDisabled();
    const rest = screen.getByRole('radiogroup', { name: 'امتیاز به رستوران' });
    await userEvent.click(within(rest).getByRole('radio', { name: '۵ ستاره' }));
    const courier = screen.getByRole('radiogroup', { name: 'امتیاز به پیک' });
    await userEvent.click(within(courier).getByRole('radio', { name: '۴ ستاره' }));
    await userEvent.type(screen.getByLabelText('نظر شما (اختیاری)'), 'عالی');
    await userEvent.click(send);
    await waitFor(() => expect(top().screen).toBe('track'));
    expect(body).toEqual({ restaurantStars: 5, courierStars: 4, text: 'عالی' });
    expect(useToast.getState().toasts[0]?.text).toBe('ممنون از امتیاز شما');
  });
});
