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

export type { SocketFactory, SocketLike } from '@/lib/socket';
