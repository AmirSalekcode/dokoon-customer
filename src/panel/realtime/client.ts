import {
  createLiveClient as createSharedLiveClient,
  type LiveClientDeps as SharedDeps,
} from '@/lib/liveClient';
import { REALTIME_EVENTS, type RealtimeMessage } from './events';

/**
 * Restaurant live connection (KAN-62): short-lived ticket (`POST /r/stream/ticket`) → WebSocket
 * `…/r/stream?ticket=…` → one JSON frame per event (contract-notes 23). The reconnecting client itself is
 * shared with the courier app (`src/lib/liveClient.ts`); the app wiring lives in live.ts.
 */
export { backoff, BACKOFF_MS, TICKET_REFUSED, type LiveStatus } from '@/lib/liveClient';

export type LiveClientDeps = Omit<SharedDeps<RealtimeMessage>, 'parse'>;

/** A frame we understand, or null (unknown events and garbage are ignored, never thrown). */
export function parseFrame(raw: unknown): RealtimeMessage | null {
  if (typeof raw !== 'string') return null;
  try {
    const v = JSON.parse(raw) as { event?: unknown; data?: unknown };
    if (!v || typeof v !== 'object') return null;
    if (!(REALTIME_EVENTS as readonly unknown[]).includes(v.event)) return null;
    if (!v.data || typeof v.data !== 'object') return null;
    return v as RealtimeMessage;
  } catch {
    return null;
  }
}

export const createLiveClient = (deps: LiveClientDeps) =>
  createSharedLiveClient({ ...deps, parse: parseFrame });

export type LiveClient = ReturnType<typeof createLiveClient>;
