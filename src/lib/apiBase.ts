import { config } from '@/config/env';

/** API base URL for both apps: real API from env; mock mode uses same-origin /api/v1 (intercepted by MSW). */
export function apiBaseUrl(): string {
  const fromEnv = config.apiBaseUrl;
  if (fromEnv) return fromEnv;
  if (typeof location !== 'undefined' && location.origin.startsWith('http'))
    return `${location.origin}/api/v1`;
  return 'http://localhost/api/v1';
}
