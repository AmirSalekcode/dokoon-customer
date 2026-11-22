import type { ErrorKind } from '@/api/errors';
import { ERROR_CONTENT, type ErrorContent } from '@/errors/errorContent';

/**
 * The courier app uses the shared ErrorPage texts (as the panel does, D-106). Only the offline text speaks
 * about orders (courier prototype `D.errors.offline`): without internet no offers arrive.
 */
export const COURIER_ERROR_CONTENT: Record<ErrorKind, ErrorContent> = {
  ...ERROR_CONTENT,
  offline: {
    ...ERROR_CONTENT.offline,
    text: 'برای دریافت سفارش‌ها باید به اینترنت وصل باشید. اتصال را بررسی کنید.',
  },
};
