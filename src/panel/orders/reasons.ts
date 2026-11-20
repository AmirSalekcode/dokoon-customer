import { panelApi, type PanelApi } from '../api/client';
import type { RejectReason } from '../api/types';

/** Reject/cancel reasons (`GET /r/reject-reasons`), read once per page load; a failure is retried next time. */
let cached: Promise<Required<RejectReason>[]> | null = null;

export function loadRejectReasons(api: PanelApi = panelApi()): Promise<Required<RejectReason>[]> {
  cached ??= api
    .GET('/r/reject-reasons')
    .then(({ data, error }) => {
      if (error !== undefined || !data) throw error ?? new Error('no reasons');
      return data.filter((r): r is Required<RejectReason> => !!r.id && !!r.label);
    })
    .catch((e: unknown) => {
      cached = null;
      throw e;
    });
  return cached;
}

/** Tests. */
export const resetRejectReasons = () => {
  cached = null;
};
