import type { ActiveOrder, Offer } from '../api/types';

export type { SocketFactory, SocketLike } from '@/lib/socket';

/**
 * Courier live events. The contract only says «WS offers» (screen-specs, Orders tab); names, payloads and
 * the `{event, data}` frame are our proposal (contract-notes 33), the same frame as the restaurant stream.
 */
export const COURIER_EVENTS = ['offer.created', 'offer.gone', 'order.updated', 'order.cancelled'] as const;

export type CourierEventName = (typeof COURIER_EVENTS)[number];

/** Why an offer left the list: another courier won it, its 30 s ran out, or the restaurant cancelled. */
export type OfferGoneReason = 'taken' | 'expired' | 'cancelled';

export type CourierRealtimeMessage =
  | { event: 'offer.created'; data: Offer }
  | { event: 'offer.gone'; data: { offerId: string; reason: OfferGoneReason } }
  | { event: 'order.updated'; data: ActiveOrder }
  | { event: 'order.cancelled'; data: { orderId: string; reason: string } };

/** One text frame → a known event, or null (unknown events and broken frames are ignored). */
export function parseCourierFrame(frame: unknown): CourierRealtimeMessage | null {
  if (typeof frame !== 'string') return null;
  try {
    const msg = JSON.parse(frame) as { event?: unknown; data?: unknown };
    if (!COURIER_EVENTS.includes(msg.event as CourierEventName)) return null;
    if (typeof msg.data !== 'object' || msg.data === null) return null;
    return msg as CourierRealtimeMessage;
  } catch {
    return null;
  }
}
