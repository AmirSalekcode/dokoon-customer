import type { DocType, Notification, Order } from '../api/types';

/**
 * Realtime events of the restaurant contract (`x-realtime`). Envelope `{ event, data }` is our
 * proposal (contract-notes 23): the contract lists names and payloads but not the frame format.
 */
export const REALTIME_EVENTS = [
  'order.created',
  'order.updated',
  'order.cancelled',
  'order.expired',
  'notification.created',
  'doc.required',
] as const;

export type RealtimeEventName = (typeof REALTIME_EVENTS)[number];

export type RealtimeMessage =
  | { event: 'order.created'; data: Order }
  | { event: 'order.updated'; data: Order }
  | { event: 'order.cancelled'; data: { orderId: string; reason: string } }
  | { event: 'order.expired'; data: { orderId: string } }
  | { event: 'notification.created'; data: Notification }
  | { event: 'doc.required'; data: DocType };

/** The part of the browser WebSocket the live client uses; mock builds pass a fake (D-71: no SW). */
export interface SocketLike {
  readonly readyState: number;
  addEventListener(type: 'open' | 'message' | 'close' | 'error', listener: (e: Event) => void): void;
  removeEventListener(type: 'open' | 'message' | 'close' | 'error', listener: (e: Event) => void): void;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

export type SocketFactory = (url: string) => SocketLike;
