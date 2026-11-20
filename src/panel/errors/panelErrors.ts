import type { ErrorKind } from '@/api/errors';
import { ERROR_CONTENT, type ErrorContent } from '@/errors/errorContent';

/**
 * The panel uses the shared ErrorPage and texts (D-106). Only the offline text speaks about orders
 * (restaurant prototype): losing the connection means missing new orders.
 */
export const PANEL_ERROR_CONTENT: Record<ErrorKind, ErrorContent> = {
  ...ERROR_CONTENT,
  offline: {
    ...ERROR_CONTENT.offline,
    text: 'برای دریافت سفارش‌ها باید به اینترنت وصل باشید. اتصال را بررسی کنید.',
  },
};

/** All kinds, for the mock-mode preview list. */
export const ERROR_KINDS = Object.keys(PANEL_ERROR_CONTENT) as ErrorKind[];
