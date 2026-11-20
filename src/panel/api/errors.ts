import type { ApiErrorBody } from './types';

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
 */
export function businessError(error: unknown): BusinessError | null {
  if (error === undefined || error === null) return null;
  const body = (typeof error === 'object' ? error : {}) as Partial<ApiErrorBody>;
  return {
    code: typeof body.code === 'string' ? body.code : 'UNKNOWN',
    message: typeof body.message === 'string' && body.message.trim() ? body.message : FALLBACK,
    ...(body.fields ? { fields: body.fields } : {}),
  };
}

/** Another device answered this order first (D-96): close the alert and toast, no error page. */
export const isAlreadyAnswered = (error: unknown) => businessError(error)?.code === 'ALREADY_ANSWERED';
