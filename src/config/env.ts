/**
 * The ONLY place that reads import.meta.env. Everything here is PUBLIC: Vite inlines VITE_* values into
 * the browser bundle, so real secrets (payment merchant keys, SMS/FCM server keys, keystore passwords)
 * must never be VITE_* — they belong to the backend or CI. See .env.example.
 */
export class EnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvError';
  }
}

export type MapId = 'neshan' | 'balad';
export type PaymentProviderId = 'fake' | 'zibal' | 'zarinpal';

export interface PublicConfig {
  useMocks: boolean;
  apiBaseUrl: string | null;
  maps: { neshanKey: string | null; baladKey: string | null };
  defaultMap: MapId;
  paymentProvider: PaymentProviderId;
  webPushPublicKey: string | null;
}

type RawEnv = Record<string, string | boolean | undefined>;

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);

function oneOf<T extends string>(name: string, v: unknown, allowed: readonly T[], fallback: T): T {
  const s = str(v);
  if (s === null) return fallback;
  if (!(allowed as readonly string[]).includes(s))
    throw new EnvError(`${name} must be one of ${allowed.join(', ')}`);
  return s as T;
}

function apiUrl(v: unknown, prod: boolean): string | null {
  const s = str(v);
  if (s === null) return null;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    throw new EnvError('VITE_API_BASE_URL is not a valid URL');
  }
  const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  if (prod && u.protocol !== 'https:' && !local)
    throw new EnvError('VITE_API_BASE_URL must use https in production');
  return s.replace(/\/$/, '');
}

/** Pure parser (unit-tested). Only whitelisted VITE_ keys are read. */
export function parseEnv(raw: RawEnv): PublicConfig {
  const prod = raw.PROD === true;
  return {
    useMocks: raw.VITE_USE_MOCKS === '1' || raw.VITE_USE_MOCKS === 'true',
    apiBaseUrl: apiUrl(raw.VITE_API_BASE_URL, prod),
    maps: { neshanKey: str(raw.VITE_NESHAN_MAP_KEY), baladKey: str(raw.VITE_BALAD_MAP_KEY) },
    defaultMap: oneOf('VITE_DEFAULT_MAP', raw.VITE_DEFAULT_MAP, ['neshan', 'balad'] as const, 'neshan'),
    paymentProvider: oneOf(
      'VITE_PAYMENT_PROVIDER',
      raw.VITE_PAYMENT_PROVIDER,
      ['fake', 'zibal', 'zarinpal'] as const,
      'fake',
    ),
    webPushPublicKey: str(raw.VITE_WEBPUSH_VAPID_PUBLIC_KEY),
  };
}

/** App config, validated once at startup. */
export const config: PublicConfig = parseEnv(import.meta.env as unknown as RawEnv);
