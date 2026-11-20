import { ApiError } from '@/api/errors';
import { setRetry } from '@/errors/retry';
import { usePanelNav } from '../nav/nav';

/**
 * Full-page kinds (offline, 401, 403, 404, 5xx) go to the ErrorPage with a retry; everything else
 * stays with the caller (inline message or toast). Returns true when the error page was shown.
 */
export function showFullPageError(e: unknown, retry: () => void): boolean {
  if (!(e instanceof ApiError) || !e.isFullPage || !e.kind) return false;
  setRetry(retry);
  usePanelNav.getState().showError(e.kind);
  return true;
}
