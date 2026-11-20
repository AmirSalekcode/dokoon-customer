import { describe, expect, it } from 'vitest';
import { parseEnv, EnvError } from './env';

describe('parseEnv (public, browser-safe config only)', () => {
  it('applies defaults when nothing is set', () => {
    const c = parseEnv({});
    expect(c.useMocks).toBe(false);
    expect(c.apiBaseUrl).toBeNull();
    expect(c.paymentProvider).toBe('fake');
    expect(c.defaultMap).toBe('neshan');
    expect(c.maps.neshanKey).toBeNull();
  });

  it('reads all VITE_ keys', () => {
    const c = parseEnv({
      VITE_USE_MOCKS: '1',
      VITE_API_BASE_URL: 'https://api.dokoon.example/v1',
      VITE_NESHAN_MAP_KEY: 'web.neshan',
      VITE_BALAD_MAP_KEY: 'web.balad',
      VITE_DEFAULT_MAP: 'balad',
      VITE_PAYMENT_PROVIDER: 'zibal',
      VITE_WEBPUSH_VAPID_PUBLIC_KEY: 'BPub',
    });
    expect(c).toMatchObject({
      useMocks: true,
      apiBaseUrl: 'https://api.dokoon.example/v1',
      maps: { neshanKey: 'web.neshan', baladKey: 'web.balad' },
      defaultMap: 'balad',
      paymentProvider: 'zibal',
      webPushPublicKey: 'BPub',
    });
  });

  it('reads the optional app update link (forced-update page) and rejects a non-https one', () => {
    expect(parseEnv({}).updateUrl).toBeNull();
    expect(parseEnv({ VITE_UPDATE_URL: 'https://dokoonapp.ir/app' }).updateUrl).toBe(
      'https://dokoonapp.ir/app',
    );
    expect(() => parseEnv({ VITE_UPDATE_URL: 'http://dokoonapp.ir/app' })).toThrow(EnvError);
    expect(() => parseEnv({ VITE_UPDATE_URL: 'not a url' })).toThrow(EnvError);
  });

  it('rejects an invalid or non-https API URL in production', () => {
    expect(() => parseEnv({ VITE_API_BASE_URL: 'not a url' })).toThrow(EnvError);
    expect(() => parseEnv({ VITE_API_BASE_URL: 'http://api.example/v1', PROD: true })).toThrow(/https/);
    expect(parseEnv({ VITE_API_BASE_URL: 'http://localhost:8080/v1' }).apiBaseUrl).toBe(
      'http://localhost:8080/v1',
    );
  });

  it('rejects unknown enum values', () => {
    expect(() => parseEnv({ VITE_PAYMENT_PROVIDER: 'paypal' })).toThrow(EnvError);
    expect(() => parseEnv({ VITE_DEFAULT_MAP: 'google' })).toThrow(EnvError);
  });

  it('never exposes server-side secret names even if present in the env object', () => {
    const c = parseEnv({ ZIBAL_MERCHANT_KEY: 'secret', SMS_API_KEY: 'secret' } as Record<string, string>);
    expect(JSON.stringify(c)).not.toContain('secret');
  });
});
