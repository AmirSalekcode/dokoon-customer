import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { server } from '@/mocks/node';
import { useToast } from '@/ui/toast';
import { CourierApp } from '../../CourierApp';
import { useCourierSession } from '../../api/session';
import { signOutToLogin } from '../../auth/flow';
import type { GeoErrorKind, GeoFix, GeoSource } from '../../location/tracker';
import { createCourierMockStream } from '../../mocks/stream';
import { useCourierNav } from '../../nav/nav';
import { setCourierSocketFactory } from '../../realtime/live';
import { setPermissionProvider, webPermissionProvider } from '../../permissions/provider';
import { MSG, setGeoSource, useOnline } from '../../state/online';
import { allGranted, fakePermissions } from '../../test/permissions';

// KAN-93 (CP-09): online switch (`PUT /c/status`, 409 with an active order) and location tracking that
// runs only while online or with an active order.
const nav = () => useCourierNav.getState();
const top = () => document.querySelector<HTMLElement>('main:not([hidden])')!;
const sw = () => within(top()).getByRole('switch');
const toasts = () => useToast.getState().toasts.map((t) => t.text);

let statusCalls: boolean[] = [];
let locations: { lat: number; lng: number; at?: string }[] = [];
let statusReply: () => Response;
let fix: ((f: GeoFix) => void) | null = null;
let geoErr: ((k: GeoErrorKind) => void) | null = null;
const geo: GeoSource = {
  watch(f, e) {
    fix = f;
    geoErr = e;
    return () => {
      fix = null;
      geoErr = null;
    };
  },
};

beforeEach(() => {
  statusCalls = [];
  locations = [];
  statusReply = () => HttpResponse.json({ online: statusCalls.at(-1) });
  server.use(
    http.put('*/v1/c/status', async ({ request }) => {
      statusCalls.push(((await request.json()) as { online: boolean }).online);
      return statusReply();
    }),
    http.get('*/v1/c/offers', () => HttpResponse.json([])),
    http.get('*/v1/c/orders/active', () => new HttpResponse(null, { status: 204 })),
    http.post('*/v1/c/location', async ({ request }) => {
      locations.push((await request.json()) as (typeof locations)[number]);
      return new HttpResponse(null, { status: 204 });
    }),
  );
  setGeoSource(geo);
  setCourierSocketFactory(createCourierMockStream().connect);
  useOnline.getState().reset();
  useToast.setState({ toasts: [] });
  useCourierSession.getState().setSession({ status: 'approved', name: 'مهدی کریمی' });
  setPermissionProvider(allGranted());
  act(() => nav().resetTo('orders'));
});
afterEach(() => {
  useOnline.getState().reset();
  setGeoSource(undefined);
  setPermissionProvider(webPermissionProvider);
});

describe('orders tab', () => {
  it('starts offline: grey switch, the offline message, «ردیابی خاموش», nothing watched', () => {
    render(<CourierApp />);
    expect(screen.getByRole('heading', { name: 'سلام مهدی کریمی عزیز' })).toBeInTheDocument();
    expect(sw()).toHaveAttribute('aria-checked', 'false');
    expect(within(top()).getByText('آفلاین هستید', { selector: 'h4' })).toBeInTheDocument();
    expect(within(top()).getByTestId('tracking')).toHaveTextContent('ردیابی خاموش');
    expect(fix).toBeNull();
  });

  it('going online: PUT {online:true}, tracking starts and positions are reported', async () => {
    render(<CourierApp />);
    await userEvent.click(sw());
    await waitFor(() => expect(sw()).toHaveAttribute('aria-checked', 'true'));
    expect(statusCalls).toEqual([true]);
    expect(toasts()).toContain(MSG.online);
    expect(within(top()).getByText('منتظر سفارش باشید')).toBeInTheDocument();
    expect(within(top()).getByTestId('tracking')).toHaveTextContent('ردیابی فعال');
    act(() => fix!({ lat: 32.0105, lng: 51.8664, at: Date.parse('2026-11-23T10:00:00Z') }));
    await waitFor(() => expect(locations).toHaveLength(1));
    expect(locations[0]).toEqual({ lat: 32.0105, lng: 51.8664, at: '2026-11-23T10:00:00.000Z' });
  });

  it('going offline stops tracking: later positions are never sent', async () => {
    render(<CourierApp />);
    await userEvent.click(sw());
    await waitFor(() => expect(sw()).toHaveAttribute('aria-checked', 'true'));
    await userEvent.click(sw());
    await waitFor(() => expect(sw()).toHaveAttribute('aria-checked', 'false'));
    expect(statusCalls).toEqual([true, false]);
    expect(fix).toBeNull();
    expect(within(top()).getByTestId('tracking')).toHaveTextContent('ردیابی خاموش');
    expect(locations).toHaveLength(0);
  });

  it('with an active order: no offline request, a warning, tracking keeps running', async () => {
    render(<CourierApp />);
    await userEvent.click(sw());
    await waitFor(() => expect(sw()).toHaveAttribute('aria-checked', 'true'));
    act(() => useOnline.getState().setActive(true));
    await userEvent.click(sw());
    expect(statusCalls).toEqual([true]);
    expect(toasts()).toContain(MSG.activeOrder);
    expect(sw()).toHaveAttribute('aria-checked', 'true');
    expect(fix).not.toBeNull();
  });

  it('server 409 ACTIVE_ORDER: stays online, warns, keeps tracking', async () => {
    render(<CourierApp />);
    await userEvent.click(sw());
    await waitFor(() => expect(sw()).toHaveAttribute('aria-checked', 'true'));
    statusReply = () => HttpResponse.json({ code: 'ACTIVE_ORDER', message: 'سفارش فعال دارید' }, { status: 409 });
    await userEvent.click(sw());
    await waitFor(() => expect(toasts()).toContain(MSG.activeOrder));
    expect(sw()).toHaveAttribute('aria-checked', 'true');
    expect(useOnline.getState().hasActive).toBe(true);
    expect(fix).not.toBeNull();
  });

  it('a failed request leaves the switch as it was', async () => {
    statusReply = () => HttpResponse.json({ code: 'BAD', message: 'x' }, { status: 400 });
    render(<CourierApp />);
    await userEvent.click(sw());
    await waitFor(() => expect(toasts()).toContain(MSG.failed));
    expect(sw()).toHaveAttribute('aria-checked', 'false');
    expect(fix).toBeNull();
  });

  it('without location permission: no request, the permissions page opens with back', async () => {
    setPermissionProvider(fakePermissions({ location: 'denied', notifications: 'granted' }));
    render(<CourierApp />);
    await userEvent.click(sw());
    await waitFor(() => expect(nav().stack.map((r) => r.screen)).toEqual(['orders', 'perm']));
    expect(statusCalls).toEqual([]);
    expect(toasts()).toContain(MSG.needLocation);
  });

  it('a refused location while online shows the problem and a way to the permissions page', async () => {
    render(<CourierApp />);
    await userEvent.click(sw());
    await waitFor(() => expect(sw()).toHaveAttribute('aria-checked', 'true'));
    act(() => geoErr!('denied'));
    expect(within(top()).getByTestId('tracking')).toHaveTextContent('موقعیت در دسترس نیست');
    await userEvent.click(within(top()).getByRole('button', { name: 'مجوزها' }));
    expect(nav().stack.at(-1)!.screen).toBe('perm');
  });

  it('sign-out tells the server and stops tracking', async () => {
    render(<CourierApp />);
    await userEvent.click(sw());
    await waitFor(() => expect(sw()).toHaveAttribute('aria-checked', 'true'));
    act(() => signOutToLogin());
    await waitFor(() => expect(statusCalls).toEqual([true, false]));
    expect(fix).toBeNull();
    expect(useOnline.getState().online).toBe(false);
    await screen.findByRole('heading', { name: 'ورود به اپ پیک' });
  });
});
