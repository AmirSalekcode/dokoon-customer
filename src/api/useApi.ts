import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ApiError } from './errors';
import { useNav } from '@/nav/nav';
import { setRetry } from '@/errors/retry';

export type ApiState<T> =
  | { status: 'loading'; data?: undefined; error?: undefined }
  | { status: 'success'; data: T; error?: undefined }
  | { status: 'error'; data?: undefined; error: unknown };

type Settled<T> = { key: string } & ({ status: 'success'; data: T } | { status: 'error'; error: unknown });

/**
 * Minimal request hook: loading / success / error with reload.
 * `deps` must be primitives (ids, query strings).
 * Full-page errors (offline, 401, 403, 404, 5xx) navigate to ErrorPage and register a retry;
 * the screen still shows its inline ErrorState underneath for when the user comes back.
 */
export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: (string | number | boolean | null | undefined)[],
  opts: { fullPageErrors?: boolean } = {},
) {
  const [tick, setTick] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const fetcherRef = useRef(fetcher);
  useLayoutEffect(() => {
    fetcherRef.current = fetcher;
  });
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const fullPage = opts.fullPageErrors ?? true;
  const key = `${deps.map(String).join('|')}#${tick}`;

  useEffect(() => {
    let alive = true;
    fetcherRef
      .current()
      .then((data) => alive && setSettled({ key, status: 'success', data }))
      .catch((error: unknown) => {
        if (!alive) return;
        setSettled({ key, status: 'error', error });
        if (fullPage && error instanceof ApiError && error.kind) {
          setRetry(reload);
          useNav.getState().showError(error.kind);
        }
      });
    return () => {
      alive = false;
    };
  }, [key, fullPage, reload]);

  const state: ApiState<T> =
    settled && settled.key === key
      ? settled.status === 'success'
        ? { status: 'success', data: settled.data }
        : { status: 'error', error: settled.error }
      : { status: 'loading' };
  return { ...state, reload };
}

/** Unwrap an openapi-fetch result: throw business errors so useApi sees them. */
export async function unwrap<T>(p: Promise<{ data?: T; error?: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error !== undefined) throw error;
  return data as T;
}
