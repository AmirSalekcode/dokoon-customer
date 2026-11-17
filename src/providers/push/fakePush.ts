import type { PushMessage, PushPermission, PushProvider, PushToken } from './PushProvider';

/** In-memory push provider for development and tests. `emit` simulates an incoming message. */
export function createFakePushProvider(initial: PushPermission = 'default'): PushProvider & {
  emit: (m: PushMessage) => void;
} {
  let perm: PushPermission = initial;
  const listeners = new Set<(m: PushMessage) => void>();
  return {
    id: 'fake',
    isSupported: async () => true,
    permission: async () => perm,
    requestPermission: async () => {
      if (perm === 'default') perm = 'granted';
      return perm;
    },
    getToken: async (): Promise<PushToken | null> =>
      perm === 'granted' ? { channel: 'other', token: 'fake-token', platform: 'web' } : null,
    onMessage: (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    emit: (m) => listeners.forEach((l) => l(m)),
  };
}
