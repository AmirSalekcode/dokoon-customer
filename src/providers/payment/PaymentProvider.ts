import type { PaymentInit } from '@/api/types';

export type GatewayId = 'zibal' | 'zarinpal';

export interface PaymentReturn {
  orderId: string;
  /** Hint only — the server has already verified with the gateway; always re-fetch the order. */
  result: 'ok' | 'fail';
}

/**
 * Online payment abstraction (CLAUDE.md rule 8). The SERVER creates the payment and verifies it
 * (`/payments/callback/{provider}`); the client only opens the gateway and handles the return deep link.
 * Cash on delivery does not go through a provider (courier collects cash).
 */
export interface PaymentProvider {
  readonly id: GatewayId | 'fake';
  /** Open the gateway page (redirect in PWA, in-app browser/WebView on Android). */
  open(init: PaymentInit): Promise<void>;
  /** Parse the app/PWA return URL `?orderId=&result=ok|fail`. */
  parseReturn(url: string): PaymentReturn | null;
}

export function parsePaymentReturn(url: string): PaymentReturn | null {
  try {
    const u = new URL(url);
    const orderId = u.searchParams.get('orderId');
    const result = u.searchParams.get('result');
    if (!orderId || (result !== 'ok' && result !== 'fail')) return null;
    return { orderId, result };
  } catch {
    return null;
  }
}
