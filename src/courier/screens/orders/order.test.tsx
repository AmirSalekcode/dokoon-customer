import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/node';
import { useToast } from '@/ui/toast';
import { CourierApp } from '../../CourierApp';
import { useCourierSession } from '../../api/session';
import type { ActiveOrder } from '../../api/types';
import { navUrl, openNavigation } from '../../maps/navLinks';
import { createCourierMockStream } from '../../mocks/stream';
import { useCourierNav } from '../../nav/nav';
import { ORDER_MSG } from '../../order/actions';
import { setPermissionProvider, webPermissionProvider } from '../../permissions/provider';
import { setCourierSocketFactory } from '../../realtime/live';
import { useActiveOrder } from '../../state/active';
import { setGeoSource, useOnline } from '../../state/online';
import { allGranted } from '../../test/permissions';

// KAN-96 (CP-12): restaurant leg → pickup — map links, call / copy, ticking dishes, `stage`, `issue`,
// withdraw only before pickup (409 after).
const nav = () => useCourierNav.getState();
const screens = () => nav().stack.map((r) => r.screen);
const top = () => document.querySelector<HTMLElement>('main:not([hidden])')!;
const toasts = () => useToast.getState().toasts.map((t) => t.text);
const dock = (name: string | RegExp) => within(top()).getByRole('button', { name });

const ORDER: ActiveOrder = {
  id: 'ord-1',
  no: 4821,
  stage: 'toRest',
  rest: 'کبابی سنتی زاگرس',
  restAddress: 'شهرضا، خیابان امام، نبش کوچه ۱۲',
  restPhone: '03153231234',
  cust: 'زهرا نوری',
  custAddress: 'خیابان شریعتی، کوچه ۷، پلاک ۱۴',
  custPhone: '09131112233',
  cash: true,
  due: 412000,
  earn: 68000,
  items: [
    { id: 'i1', q: 2, name: 'چلوکباب کوبیده', opt: 'دوغ' },
    { id: 'i2', q: 1, name: 'سالاد شیرازی', opt: '' },
  ],
};

let stageCalls: { stage: string; checkedItems?: string[] }[];
let stageReply: (b: { stage: string }) => Response;
let withdrawReply: () => Response;
let withdrawn: string[];
let issues: string[];

beforeEach(() => {
  stageCalls = [];
  withdrawn = [];
  issues = [];
  stageReply = (b) => HttpResponse.json({ ...useActiveOrder.getState().order, stage: b.stage });
  withdrawReply = () => new HttpResponse(null, { status: 204 });
  server.use(
    // Like the server: once given back (withdraw 204), there is no active order any more.
    http.get('*/v1/c/orders/active', () =>
      withdrawn.length && withdrawReply().status === 204
        ? new HttpResponse(null, { status: 204 })
        : HttpResponse.json(useActiveOrder.getState().order ?? ORDER),
    ),
    http.get('*/v1/c/offers', () => HttpResponse.json([])),
    http.post('*/v1/c/location', () => new HttpResponse(null, { status: 204 })),
    http.post('*/v1/c/orders/:id/stage', async ({ request }) => {
      const b = (await request.json()) as { stage: string; checkedItems?: string[] };
      stageCalls.push(b);
      return stageReply(b);
    }),
    http.post('*/v1/c/orders/:id/withdraw', async ({ request }) => {
      withdrawn.push(((await request.json()) as { reason: string }).reason);
      return withdrawReply();
    }),
    http.post('*/v1/c/orders/:id/issue', async ({ request }) => {
      issues.push(((await request.json()) as { reason: string }).reason);
      return new HttpResponse(null, { status: 204 });
    }),
  );
  setCourierSocketFactory(createCourierMockStream().connect);
  setGeoSource({ watch: () => () => {} });
  useOnline.getState().reset();
  useToast.setState({ toasts: [] });
  useCourierSession.getState().setSession({ status: 'approved', name: 'مهدی کریمی' });
  setPermissionProvider(allGranted());
  act(() => {
    useActiveOrder.getState().set(ORDER, { kmToRest: 0.8, km: 2.4, minutes: 12 });
    nav().resetTo('orders');
    nav().push('order', { id: 'ord-1' });
  });
});
afterEach(() => {
  useActiveOrder.getState().clear();
  useOnline.getState().reset();
  setGeoSource(undefined);
  setPermissionProvider(webPermissionProvider);
  vi.restoreAllMocks();
});

describe('to the restaurant', () => {
  it('stages, map chip from the accepted offer, the restaurant card; no customer data yet', () => {
    render(<CourierApp />);
    expect(within(top()).getByRole('heading', { name: 'سفارش #۴۸۲۱' })).toBeInTheDocument();
    expect(top()).toHaveTextContent('۰٫۸ کیلومتر');
    // The offer's minutes are for the whole trip, not this leg: no time is shown (contract-notes 41).
    expect(top()).not.toHaveTextContent('دقیقه');
    expect(top()).toHaveTextContent('کبابی سنتی زاگرس');
    expect(top()).toHaveTextContent('نبش کوچه ۱۲');
    expect(top()).not.toHaveTextContent('زهرا نوری');
    expect(top()).not.toHaveTextContent('شریعتی');
    expect(dock('به رستوران رسیدم')).toBeEnabled();
  });

  it('Neshan / Balad open a search for the restaurant address', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    render(<CourierApp />);
    await userEvent.click(within(top()).getByRole('button', { name: /نشان/ }));
    await userEvent.click(within(top()).getByRole('button', { name: /بلد/ }));
    expect(open.mock.calls.map((c) => String(c[0]))).toEqual([
      navUrl('neshan', { address: ORDER.restAddress! }),
      navUrl('balad', { address: ORDER.restAddress! }),
    ]);
  });

  it('«به رستوران رسیدم» → stage pickup', async () => {
    render(<CourierApp />);
    await userEvent.click(dock('به رستوران رسیدم'));
    await waitFor(() => expect(useActiveOrder.getState().order?.stage).toBe('pickup'));
    expect(stageCalls).toEqual([{ stage: 'pickup' }]);
    expect(within(top()).getByRole('heading', { name: 'غذاها را تطبیق دهید' })).toBeInTheDocument();
  });

  it('409 INVALID_STAGE: re-reads the order instead of guessing', async () => {
    stageReply = () => HttpResponse.json({ code: 'INVALID_STAGE', message: 'x' }, { status: 409 });
    render(<CourierApp />);
    await userEvent.click(dock('به رستوران رسیدم'));
    await waitFor(() => expect(toasts()).toContain(ORDER_MSG.stale));
    expect(useActiveOrder.getState().order?.stage).toBe('toRest');
  });
});

describe('pickup', () => {
  beforeEach(() => act(() => useActiveOrder.getState().set({ ...ORDER, stage: 'pickup' })));

  it('every dish must be ticked; the ticked ids go with the step', async () => {
    render(<CourierApp />);
    const btn = dock('سفارش را تحویل گرفتم');
    expect(btn).toBeDisabled();
    const boxes = within(top()).getAllByRole('checkbox');
    expect(boxes).toHaveLength(2);
    await userEvent.click(boxes[0]);
    expect(btn).toBeDisabled();
    await userEvent.click(boxes[1]);
    expect(boxes[1]).toHaveAttribute('aria-checked', 'true');
    expect(btn).toBeEnabled();
    await userEvent.click(btn);
    await waitFor(() => expect(useActiveOrder.getState().order?.stage).toBe('toCust'));
    expect(stageCalls[0]).toEqual({ stage: 'toCust', checkedItems: ['i1', 'i2'] });
  });

  it('ticks survive leaving the page and coming back', async () => {
    render(<CourierApp />);
    await userEvent.click(within(top()).getAllByRole('checkbox')[0]);
    act(() => nav().back());
    act(() => nav().push('order', { id: 'ord-1' }));
    expect(within(top()).getAllByRole('checkbox')[0]).toHaveAttribute('aria-checked', 'true');
  });

  it('«مشکل در سفارش دارم» → reason → POST issue; the order goes on', async () => {
    render(<CourierApp />);
    await userEvent.click(within(top()).getByRole('button', { name: 'مشکل در سفارش دارم' }));
    await userEvent.click(screen.getByRole('radio', { name: 'غذای اشتباه است' }));
    await userEvent.click(screen.getByRole('button', { name: 'ثبت مشکل' }));
    await waitFor(() => expect(issues).toEqual(['غذای اشتباه است']));
    expect(toasts()).toContain(ORDER_MSG.issue);
    expect(useActiveOrder.getState().order?.stage).toBe('pickup');
  });
});

describe('withdraw', () => {
  it('before pickup: reason → POST withdraw → back on the orders tab, no active order', async () => {
    render(<CourierApp />);
    await userEvent.click(within(top()).getByRole('button', { name: 'انصراف از سفارش' }));
    await userEvent.click(screen.getByRole('radio', { name: 'مسیر بسته است' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'انصراف از سفارش' }));
    await waitFor(() => expect(withdrawn).toEqual(['مسیر بسته است']));
    expect(screens()).toEqual(['orders']);
    expect(useActiveOrder.getState().order).toBeNull();
    expect(useOnline.getState().hasActive).toBe(false);
    expect(toasts()).toContain(ORDER_MSG.withdrawn);
  });

  it('409 WITHDRAW_CLOSED: stays, says why, re-reads the order', async () => {
    withdrawReply = () => HttpResponse.json({ code: 'WITHDRAW_CLOSED', message: 'x' }, { status: 409 });
    render(<CourierApp />);
    await userEvent.click(within(top()).getByRole('button', { name: 'انصراف از سفارش' }));
    await userEvent.click(screen.getByRole('radio', { name: 'مشکل شخصی پیش آمد' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'انصراف از سفارش' }));
    await waitFor(() => expect(toasts()).toContain(ORDER_MSG.withdrawClosed));
    expect(screens()).toEqual(['orders', 'order']);
  });

  it('not offered after pickup', () => {
    act(() => useActiveOrder.getState().set({ ...ORDER, stage: 'toCust' }));
    render(<CourierApp />);
    expect(within(top()).queryByRole('button', { name: 'انصراف از سفارش' })).toBeNull();
  });
});

describe('map links', () => {
  it('a point when coordinates exist, an address search otherwise', () => {
    expect(navUrl('neshan', { address: 'خیابان امام' })).toContain(encodeURIComponent('خیابان امام'));
    expect(navUrl('balad', { address: 'x', lat: 32.01, lng: 51.86 })).toContain('32.01');
  });

  it('falls back to the other provider when the picked one cannot open', () => {
    const tried: string[] = [];
    const open = (url: string) => {
      tried.push(url);
      return !url.includes('neshan');
    };
    expect(openNavigation('neshan', { address: 'a' }, open)).toBe('balad');
    expect(tried).toHaveLength(2);
    expect(openNavigation('balad', { address: '' }, open)).toBeNull();
  });
});
