import { encodeMultipart, UploadError, type UploadRule } from '@/lib/upload';
import { panelApi, type PanelApi } from '../api/client';

/**
 * Shared upload tool of the panel (KAN-60; dish photos and logo reuse it, KAN-67/70):
 * check type/size against the server's rule (`GET /r/doc-types` per document, D-99), shrink photos to
 * 1600px JPEG 0.85, then `POST /uploads` (multipart, customer contract; contract-notes 21) → upload id.
 */
export { acceptAttr, encodeMultipart, prepareFile, UploadError, type UploadRule } from '@/lib/upload';

/** Dish photos / logo (D-99): jpeg/png/webp up to 5 MB. */
export const PHOTO_RULE: UploadRule = { accept: ['image/jpeg', 'image/png', 'image/webp'], maxMb: 5 };

export interface Uploaded {
  id: string;
  url?: string;
}

/** `POST /uploads` (not in the restaurant contract yet, so untyped like /app/config). */
export async function uploadFile(file: File, api: PanelApi = panelApi()): Promise<Uploaded> {
  const { body, contentType } = await encodeMultipart(file);
  const post = api.POST as unknown as (
    path: string,
    init: {
      body: Uint8Array;
      bodySerializer: (b: Uint8Array) => Uint8Array;
      headers: Record<string, string>;
    },
  ) => Promise<{ data?: { id?: string; url?: string }; error?: { message?: string } }>;
  const { data, error } = await post('/uploads', {
    body,
    bodySerializer: (b) => b,
    headers: { 'Content-Type': contentType },
  });
  if (error !== undefined || !data?.id)
    throw new UploadError(error?.message?.trim() || 'بارگذاری انجام نشد؛ دوباره تلاش کنید');
  return { id: data.id, url: data.url };
}
