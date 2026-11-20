import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { server } from '@/mocks/node';
import { useToast } from '@/ui/toast';
import { addIncomingOrder } from '../mocks/db';
import { panelHandlers, resetPanelMockDb } from '../mocks/handlers';
import { usePanelNav } from '../nav/nav';
import { PanelShell } from '../shell/PanelShell';
import { countByTab, useOrders } from '../state/orders';
import { useRestaurant } from '../state/restaurant';
import { signedIn, signedOut, testStream } from '../test/session';
import { LIVE_TIMING, onLiveEvent, streamUrl, useLive } from './live';

// KAN-62: live connection → orders store; loss → offline page + 15 s refresh; back → page closes, sync.
const saved = { ...LIVE_TIMING };
beforeEach(() => {
  server.use(...panelHandlers);
  resetPanelMockDb();
  localStorage.clear();
  useToast.setState({ toasts: [] });
  useRestaurant.setState({ profile: null, status: 'idle', switching: false });
  useOrders.getState().reset();
  usePanelNav.getState().resetTo('login');
  Object.assign(LIVE_TIMING, { graceMs: 60, pollMs: 120 });
  testStream.outage(false);
});
afterEach(() => {
  Object.assign(LIVE_TIMING, saved);
  testStream.outage(false);
  signedOut();
});

const newCount = () => countByTab(useOrders.getState().byId).new;
const offlinePage = () => screen.queryByRole('heading', { name: 'اینترنت متصل نیست' });

async function boot() {
  signedIn();
  render(<PanelShell />);
  await screen.findByRole('heading', { level: 1, name: 'کبابی سنتی زاگرس' });
  await waitFor(() => expect(useLive.getState().status).toBe('open'));
  await waitFor(() => expect(useOrders.getState().status).toBe('ready'));
}

describe('live connection', () => {
  it('connects with a ticket while the shift is on and syncs the active orders', async () => {
    await boot();
    expect(testStream.connected).toBe(1);
    expect(newCount()).toBe(2);
    expect(screen.getByTestId('orders-summary')).toHaveTextContent('۲ سفارش جدید');
  });

  it('events update the store and reach listeners (new-order alert, KAN-64)', async () => {
    await boot();
    const seen: string[] = [];
    const off = onLiveEvent((m) => seen.push(m.event));
    act(() => testStream.emit({ event: 'order.created', data: addIncomingOrder() }));
    expect(newCount()).toBe(3);
    expect(screen.getByTestId('orders-summary')).toHaveTextContent('۳ سفارش جدید');
    const first = Object.values(useOrders.getState().byId).find((o) => o.status === 'new')!;
    act(() => testStream.emit({ event: 'order.expired', data: { orderId: first.id! } }));
    expect(newCount()).toBe(2);
    expect(seen).toEqual(['order.created', 'order.expired']);
    off();
  });

  it('loss → offline page after the grace, list refreshed while down; back → page closes and syncs', async () => {
    await boot();
    act(() => testStream.outage(true));
    expect(useLive.getState().status).toBe('down');
    expect(await screen.findByRole('heading', { name: 'اینترنت متصل نیست' })).toBeInTheDocument();
    // An order arrives on the server during the outage: the periodic refresh picks it up.
    addIncomingOrder();
    await waitFor(() => expect(newCount()).toBe(3));
    addIncomingOrder();
    act(() => testStream.outage(false));
    await waitFor(() => expect(useLive.getState().status).toBe('open'), { timeout: 4000 });
    await waitFor(() => expect(offlinePage()).toBeNull());
    await waitFor(() => expect(newCount()).toBe(4));
    expect(usePanelNav.getState().stack.map((r) => r.screen)).toEqual(['orders']);
  });

  it('a short blip never shows the offline page', async () => {
    Object.assign(LIVE_TIMING, { graceMs: 3000 });
    await boot();
    act(() => testStream.dropAll());
    await waitFor(() => expect(useLive.getState().status).toBe('open'), { timeout: 4000 });
    expect(offlinePage()).toBeNull();
  });

  it('logout closes the connection', async () => {
    await boot();
    const { logout } = await import('../auth/flow');
    await act(() => logout());
    expect(useLive.getState().status).toBe('idle');
    expect(testStream.connected).toBe(0);
  });

  it('stream URL follows the API base (https → wss)', () => {
    expect(streamUrl('https://api.dokoonapp.ir/v1')).toBe('wss://api.dokoonapp.ir/v1/r/stream');
    expect(streamUrl('http://127.0.0.1:5176/api/v1')).toBe('ws://127.0.0.1:5176/api/v1/r/stream');
  });
});
