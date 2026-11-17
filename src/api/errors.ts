/** Full-page error kinds (screen-specs §5). */
export type ErrorKind = 'offline' | 'e401' | 'e403' | 'e404' | 'e500' | 'e503' | 'e504';

export class ApiError extends Error {
  readonly kind: ErrorKind | null;
  readonly status: number;
  /** Machine code from the contract Error schema (e.g. OTP_INVALID), if any. */
  readonly code: string | null;

  constructor(opts: { status: number; kind: ErrorKind | null; code?: string | null; message?: string }) {
    super(opts.message ?? `HTTP ${opts.status}`);
    this.name = 'ApiError';
    this.status = opts.status;
    this.kind = opts.kind;
    this.code = opts.code ?? null;
  }

  /** Errors that must leave the screen (full ErrorPage) rather than show inline. */
  get isFullPage(): boolean {
    return this.kind !== null;
  }
}

/**
 * Map HTTP status → ErrorPage kind. 4xx business errors (400/409/422/429) return null:
 * they are handled inline by the screen using `code` + Persian `message`.
 */
export function kindForStatus(status: number): ErrorKind | null {
  if (status === 0) return 'offline';
  if (status === 401) return 'e401';
  if (status === 403) return 'e403';
  if (status === 404) return 'e404';
  if (status === 503) return 'e503';
  if (status === 504 || status === 408) return 'e504';
  if (status >= 500) return 'e500';
  return null;
}
