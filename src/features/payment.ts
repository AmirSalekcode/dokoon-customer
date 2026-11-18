import { api } from '@/api/client';
import type { Order } from '@/api/types';

/**
 * Fake-gateway only: tell the (mock) server how the simulated payment ended, as the real gateway
 * would via `/payments/callback/{provider}`. With Zibal/ZarinPal the browser is redirected there by
 * the gateway itself and this is never called from the app.
 */
export async function simulateGatewayReturn(orderId: string, result: 'ok' | 'fail') {
  await api.GET('/payments/callback/{provider}', {
    params: { path: { provider: 'zibal' }, query: { orderId, result } as never },
  });
}

/** The server's word on the order (never trust the gateway's query string). */
export async function fetchOrder(orderId: string): Promise<Order | null> {
  try {
    const { data } = await api.GET('/orders/{id}', { params: { path: { id: orderId } } });
    return data ?? null;
  } catch {
    return null;
  }
}
