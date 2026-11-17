import { ApiError, kindForStatus } from './errors';

export interface HttpOptions {
  timeoutMs?: number;
  /** Retries for 503/504/timeouts on idempotent requests (GET/HEAD). */
  retries?: number;
  backoffMs?: number;
  getAccessToken?: () => string | null;
  /** Called once on 401; return true if the token was refreshed and the request may be retried. */
  onUnauthorized?: () => Promise<boolean>;
  isOnline?: () => boolean;
  fetchImpl?: typeof fetch;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Central HTTP layer (screen-specs §5): timeout, retry with exponential backoff for 503/504,
 * bearer auth, single refresh on 401, and status → ErrorKind mapping via ApiError.
 * Returns a fetch-compatible function so the generated openapi-fetch client can use it.
 */
export function createHttp(opts: HttpOptions = {}): typeof fetch {
  const timeoutMs = opts.timeoutMs ?? 15000;
  const retries = opts.retries ?? 2;
  const backoffMs = opts.backoffMs ?? 400;
  const isOnline = opts.isOnline ?? (() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  const doFetch: typeof fetch = async (input, init) => {
    const baseFetch = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
    const request = new Request(input, init);
    const idempotent = request.method === 'GET' || request.method === 'HEAD';
    let refreshed = false;

    for (let attempt = 0; ; attempt++) {
      if (!isOnline()) throw new ApiError({ status: 0, kind: 'offline', message: 'offline' });

      const req = request.clone();
      const token = opts.getAccessToken?.();
      if (token && !req.headers.has('Authorization')) req.headers.set('Authorization', `Bearer ${token}`);

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      let res: Response;
      try {
        res = await baseFetch(new Request(req, { signal: ctrl.signal }));
      } catch (err) {
        clearTimeout(timer);
        const timedOut = ctrl.signal.aborted;
        if (timedOut && idempotent && attempt < retries) {
          await sleep(backoffMs * 2 ** attempt);
          continue;
        }
        if (timedOut) throw new ApiError({ status: 504, kind: 'e504', message: 'timeout' });
        // Network failure (DNS, connection refused, offline) → offline page.
        throw new ApiError({ status: 0, kind: 'offline', message: String(err) });
      }
      clearTimeout(timer);

      if ((res.status === 503 || res.status === 504) && idempotent && attempt < retries) {
        await sleep(backoffMs * 2 ** attempt);
        continue;
      }
      if (res.status === 401 && !refreshed && opts.onUnauthorized) {
        refreshed = true;
        if (await opts.onUnauthorized()) continue;
      }
      if (res.ok) return res;

      let code: string | null = null;
      let message: string | undefined;
      try {
        const body = (await res.clone().json()) as { code?: string; message?: string };
        code = body.code ?? null;
        message = body.message;
      } catch {
        /* non-JSON error body */
      }
      const kind = kindForStatus(res.status);
      if (kind === null) {
        // Business error: hand the Response back so openapi-fetch exposes `error` to the screen.
        return res;
      }
      throw new ApiError({ status: res.status, kind, code, message });
    }
  };
  return doFetch;
}
