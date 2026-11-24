import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { server } from '@/mocks/node';
import { useToast } from '@/ui/toast';
import { CourierApp } from '../../CourierApp';
import { useCourierSession } from '../../api/session';
import type { ActiveOrder } from '../../api/types';
import { createCourierMockStream } from '../../mocks/stream';
import { useCourierNav } from '../../nav/nav';
import { ORDER_MSG } from '../../order/actions';
import { setPermissionProvider, webPermissionProvider } from '../../permissions/provider';
import { setCourierSocketFactory } from '../../realtime/live';
import { useActiveOrder } from '../../state/active';
import { setGeoSource, useOnline } from '../../state/online';
import { allGranted } from '../../test/permissions';
import { parseToman } from './OrderScreen';

// KAN-97 (CP-13): customer leg (address/phone only now), «مشتری در دسترس نیست», handover with cash
// (mismatch warns, never blocks) or online, summary, and the customer's data gone after delivery.
const nav = () => useCourierNav.getState();
const top = () => document.querySelector<HTMLElement>('main:not([hidden])')!;
const toasts = () => useToast.getState().toasts.map((t) => t.text);
const btn = (name: string | RegExp) => within(top()).getByRole('button', { name });

const CUST = 'زهرا نوری';
const ADDRESS = 'خیابان شریعتی، کوچه ۷، پلاک ۱۴';
const PHONE = '09131112233';
const ORDER: ActiveOrder = {
  id: 'ord-1',
  no: 4821,
  stage: 'toCust',
  rest: 'کبابی سنتی زاگرس',
  restAddress: 'شهرضا، خیابان امام',
  cust: CUST,
  custAddress: ADDRESS,
  custPhone: PHONE,
  note: 'طبقه ۲، زنگ را دوبار بزنید',
  cash: true,
  due: 412000,
  earn: 68000,
  items: [{ id: 'i1', q: 1, name: 'چلوکباب' }],
};

let delivered: { cashCollected?: number }[];
let unreachable: number;
let serverOrder: ActiveOrder | null;

beforeEach(() => {
  delivered = [];
  unreachable = 0;
  serverOrder = ORDER;
  server.use(
    http.get('*/v1/c/orders/active', () =>
      serverOrder ? HttpResponse.json(serverOrder) : new HttpResponse(null, { status: 204 }),
    ),
    http.get('*/v1/c/offers', () => HttpResponse.json([])),
    http.post('*/v1/c/location', () => new HttpResponse(null, { status: 204 })),
    http.post('*/v1/c/orders/:id/stage', async ({ request }) => {
      const b = (await request.json()) as { stage: ActiveOrder['stage'] };
      serverOrder = { ...serverOrder!, stage: b.stage };
      return HttpResponse.json(serverOrder);
    }),
    http.post('*/v1/c/orders/:id/unreachable', () => {
      unreachable += 1;
      return new HttpResponse(null, { status: 204 });
    }),
    http.post('*/v1/c/orders/:id/deliver', async ({ request }) => {
      const b = (await request.json()) as { cashCollected?: number };
      delivered.push(b);
      const cashMismatch = serverOrder!.cash ? b.cashCollected !== serverOrder!.due : false;
      serverOrder = null;
      return HttpResponse.json({ earn: 68000, cashMismatch });
    }),
  );
  setCourierSocketFactory(createCourierMockStream().connect);
  setGeoSource({ watch: () => () => {} });
  useOnline.getState().reset();
  useToast.setState({ toasts: [] });
  useCourierSession.getState().setSession({ status: 'approved', name: 'مهدی کریمی' });
  setPermissionProvider(allGranted());
  open(ORDER);
});
afterEach(() => {
  useActiveOrder.getState().clear();
  useOnline.getState().reset();
  setGeoSource(undefined);
  setPermissionProvider(webPermissionProvider);
});

function open(order: ActiveOrder) {
  serverOrder = order;
  act(() => {
    useActiveOrder.getState().set(order, { kmToRest: 0.8, km: 2.4, minutes: 12 });
    nav().resetTo('orders');
    nav().push('order', { id: order.id! });
  });
}

describe('to the customer', () => {
  it('shows the customer only now: name, address, note, call; route chip from the offer', () => {
    render(<CourierApp />);
    expect(top()).toHaveTextContent(CUST);
    expect(top()).toHaveTextContent(ADDRESS);
    expect(top()).toHaveTextContent('زنگ را دوبار بزنید');
    expect(top()).toHaveTextContent('۲٫۴ کیلومتر');
    expect(btn(`تماس با ${CUST}`)).toBeEnabled();
    expect(within(top()).queryByRole('button', { name: 'انصراف از سفارش' })).toBeNull();
  });

  it('«مشتری در دسترس نیست» → confirm → reported; the order stays open', async () => {
    render(<CourierApp />);
    await userEvent.click(btn('مشتری در دسترس نیست'));
    await userEvent.click(screen.getByRole('button', { name: 'گزارش به مدیر شهر' }));
    await waitFor(() => expect(unreachable).toBe(1));
    expect(toasts()).toContain(ORDER_MSG.unreachable);
    expect(top()).toHaveTextContent('گزارش برای مدیر شهر ارسال شد');
    expect(useActiveOrder.getState().order?.stage).toBe('toCust');
    expect(btn('به مشتری رسیدم')).toBeEnabled();
  });
});

describe('handover', () => {
  it('cash, exact amount: «مبلغ دقیق» fills it; delivered → summary; customer data gone', async () => {
    open({ ...ORDER, stage: 'handover' });
    render(<CourierApp />);
    const deliverBtn = btn('سفارش تحویل شد');
    expect(deliverBtn).toBeDisabled(); // the collected amount is always entered for cash orders
    expect(top()).toHaveTextContent('۴۱۲٬۰۰۰ تومان');
    await userEvent.click(btn(/مبلغ دقیق/));
    expect(deliverBtn).toBeEnabled();
    await userEvent.click(deliverBtn);
    await waitFor(() => expect(delivered).toEqual([{ cashCollected: 412000 }]));
    expect(await within(top()).findByRole('heading', { name: /^سفارش تحویل شد،/ })).toBeInTheDocument();
    expect(top()).toHaveTextContent('۶۸٬۰۰۰ تومان');
    expect(top()).not.toHaveTextContent('مغایرت');

    // PII: nothing of the customer stays in the page, the store or browser storage.
    const pii = [CUST, ADDRESS, PHONE, 'زنگ را دوبار'];
    for (const v of pii) expect(document.body.textContent).not.toContain(v);
    const store = JSON.stringify(useActiveOrder.getState());
    for (const v of pii) expect(store).not.toContain(v);
    const stored = JSON.stringify({ ...localStorage, ...sessionStorage });
    for (const v of pii) expect(stored).not.toContain(v);
    expect(useOnline.getState().hasActive).toBe(false);

    await userEvent.click(within(top()).getByRole('button', { name: /سفارش‌ها|بازگشت به سفارش‌ها|ادامه/ }));
    expect(nav().stack.map((r) => r.screen)).toEqual(['orders']);
    expect(useActiveOrder.getState().done).toBeNull();
  });

  it('cash, different amount (Persian digits typed): warns, still delivers, mismatch reported', async () => {
    open({ ...ORDER, stage: 'handover' });
    render(<CourierApp />);
    await userEvent.type(within(top()).getByRole('textbox'), '۴۰۰۰۰۰');
    expect(top()).toHaveTextContent('فرق دارد');
    const deliverBtn = btn('سفارش تحویل شد');
    expect(deliverBtn).toBeEnabled();
    await userEvent.click(deliverBtn);
    await waitFor(() => expect(delivered).toEqual([{ cashCollected: 400000 }]));
    expect(toasts()).toContain(ORDER_MSG.mismatch);
    expect(await within(top()).findByText('گزارش شد')).toBeInTheDocument();
  });

  it('online payment: no amount asked, delivered with an empty body', async () => {
    open({ ...ORDER, stage: 'handover', cash: false, due: 0 });
    render(<CourierApp />);
    expect(top()).toHaveTextContent('پرداخت به‌صورت آنلاین انجام شده است');
    expect(within(top()).queryByRole('textbox')).toBeNull();
    await userEvent.click(btn('سفارش تحویل شد'));
    await waitFor(() => expect(delivered).toEqual([{}]));
    expect(await within(top()).findByRole('heading', { name: /^سفارش تحویل شد،/ })).toBeInTheDocument();
  });

  it('to the customer → «به مشتری رسیدم» → handover', async () => {
    render(<CourierApp />);
    await userEvent.click(btn('به مشتری رسیدم'));
    await waitFor(() => expect(useActiveOrder.getState().order?.stage).toBe('handover'));
    expect(btn('سفارش تحویل شد')).toBeDisabled();
  });
});

it('parseToman: digits only, Persian/Arabic digits, empty = undefined', () => {
  expect(parseToman('۴۱۲٬۰۰۰')).toBe(412000);
  expect(parseToman('٤٠٠')).toBe(400);
  expect(parseToman('')).toBeUndefined();
  expect(parseToman('abc')).toBeUndefined();
});
