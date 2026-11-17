export type PushChannel = 'fcm' | 'webpush' | 'other';
export type PushPermission = 'granted' | 'denied' | 'default';

export interface PushToken {
  channel: PushChannel;
  token: string;
  platform: 'android' | 'ios-pwa' | 'web';
}

export interface PushMessage {
  title: string;
  body: string;
  /** Deep link target, e.g. { screen: 'track', id: 'o1' } */
  target?: { screen: string; id?: string };
}

/**
 * Push abstraction (CLAUDE.md rule 10). FCM may be blocked in Iran; the alternative is undecided.
 * iPhone Web Push only works on iOS ≥ 16.4 when the PWA is installed to the home screen.
 * The token is registered with the server via POST /me/devices.
 */
export interface PushProvider {
  readonly id: string;
  isSupported(): Promise<boolean>;
  permission(): Promise<PushPermission>;
  requestPermission(): Promise<PushPermission>;
  getToken(): Promise<PushToken | null>;
  onMessage(cb: (m: PushMessage) => void): () => void;
}
