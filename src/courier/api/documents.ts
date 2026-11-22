import { encodeMultipart, UploadError, type UploadRule } from '@/lib/upload';
import type { CourierApi } from './client';

/**
 * `DocType` in the courier contract has no type/size rule (contract-notes 38). Until it does, the app
 * allows photos and PDF up to 10 MB (the size the mock rejects with `413`); photos are shrunk first.
 */
export const COURIER_DOC_RULE: UploadRule = {
  accept: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  maxMb: 10,
};

/**
 * `POST /c/documents/{type}` (multipart `file`) → `202` in review. Registration (KAN-91) and renewing a
 * document (KAN-101) use it. Throws UploadError with a Persian message; full-page kinds (offline, 5xx)
 * are thrown as ApiError by the HTTP layer.
 */
export async function uploadCourierDocument(api: CourierApi, type: string, file: File): Promise<void> {
  const { body, contentType } = await encodeMultipart(file);
  const post = api.POST as unknown as (
    path: '/c/documents/{type}',
    init: {
      params: { path: { type: string } };
      body: Uint8Array;
      bodySerializer: (b: Uint8Array) => Uint8Array;
      headers: Record<string, string>;
    },
  ) => Promise<{ error?: { message?: string }; response: Response }>;
  const { error, response } = await post('/c/documents/{type}', {
    params: { path: { type } },
    body,
    bodySerializer: (b) => b,
    headers: { 'Content-Type': contentType },
  });
  if (response.status === 413) throw new UploadError('حجم فایل زیاد است؛ عکس کوچک‌تری انتخاب کنید');
  if (error !== undefined || !response.ok)
    throw new UploadError(error?.message?.trim() || 'بارگذاری انجام نشد؛ دوباره تلاش کنید');
}
