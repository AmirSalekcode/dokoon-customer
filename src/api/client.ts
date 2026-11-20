import createClient from 'openapi-fetch';
import type { paths } from './schema';
import { createHttp } from './http';
import { useSession } from '@/auth/session';
import { apiBaseUrl } from '@/lib/apiBase';

export { apiBaseUrl };

let refreshing: Promise<boolean> | null = null;

async function refreshTokens(baseUrl: string): Promise<boolean> {
  const { refreshToken, setSession, clear } = useSession.getState();
  if (!refreshToken) return false;
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        clear();
        return false;
      }
      const body = (await res.json()) as { accessToken?: string; refreshToken?: string };
      if (!body.accessToken || !body.refreshToken) return false;
      setSession({ accessToken: body.accessToken, refreshToken: body.refreshToken });
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export function createApi(baseUrl = apiBaseUrl()) {
  return createClient<paths>({
    baseUrl,
    fetch: createHttp({
      getAccessToken: () => useSession.getState().accessToken,
      onUnauthorized: () => refreshTokens(baseUrl),
    }),
  });
}

/** Typed client generated from contract/dokoon-openapi.yaml (`npm run api:gen`). */
export const api = createApi();
export type Api = ReturnType<typeof createApi>;
