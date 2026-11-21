/** Inline (non full-page) error: machine code + Persian message safe to show. */
export interface BusinessError {
  code: string;
  message: string;
  fields?: Record<string, string>;
}

const FALLBACK = 'مشکلی پیش آمد؛ دوباره تلاش کنید';

/**
 * openapi-fetch `error` of a 400/409/422/429 response → what the screen shows. Full-page kinds
 * (offline, 401, 403, 404, 5xx) never reach here: the HTTP layer throws them as ApiError.
 * Shared by the restaurant panel and the courier app (same `{code, message, fields}` body).
 */
export function businessError(error: unknown): BusinessError | null {
  if (error === undefined || error === null) return null;
  const body = (typeof error === 'object' ? error : {}) as Partial<BusinessError>;
  return {
    code: typeof body.code === 'string' ? body.code : 'UNKNOWN',
    message: typeof body.message === 'string' && body.message.trim() ? body.message : FALLBACK,
    ...(body.fields ? { fields: body.fields } : {}),
  };
}
