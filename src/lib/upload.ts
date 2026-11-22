import { isImage, resizeImage } from './image';
import { toFaDigits } from './format';

/**
 * Upload helpers shared by the restaurant panel and the courier app: check type/size against the server's
 * rule (D-99), shrink photos to 1600px JPEG 0.85, encode one multipart `file` part.
 */
export interface UploadRule {
  /** Allowed MIME types from the server (e.g. image/jpeg, application/pdf). */
  accept?: string[];
  maxMb?: number;
}

export class UploadError extends Error {}

const LABELS: Record<string, string> = {
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
  'application/pdf': 'PDF',
};
const kinds = (accept: string[]) => [...new Set(accept.map((t) => LABELS[t] ?? t))].join('، ');

/** Value for <input accept>. */
export const acceptAttr = (rule: UploadRule) =>
  rule.accept?.length ? rule.accept.join(',') : 'image/*,application/pdf';

/** Validate and shrink a picked file. Throws UploadError with a Persian message. */
export async function prepareFile(file: File, rule: UploadRule): Promise<File> {
  const accept = rule.accept ?? [];
  // Some phones report an empty type for camera photos: trust the extension then.
  const type =
    file.type ||
    (/\.jpe?g$/i.test(file.name) ? 'image/jpeg' : /\.pdf$/i.test(file.name) ? 'application/pdf' : '');
  if (accept.length && !accept.includes(type))
    throw new UploadError(`این نوع فایل پذیرفته نمی‌شود؛ فقط ${kinds(accept)}`);
  const ready = isImage(type)
    ? await resizeImage(type === file.type ? file : new File([file], file.name, { type }))
    : file;
  if (rule.maxMb && ready.size > rule.maxMb * 1024 * 1024)
    throw new UploadError(`حجم فایل بیشتر از ${toFaDigits(rule.maxMb)} مگابایت است`);
  return ready;
}

/**
 * multipart/form-data with one `file` part, encoded to bytes once: a fixed-length body survives the
 * HTTP layer's request clones (retry / token refresh) in every runtime. The file name sent is ASCII
 * (server stores under a random name anyway, security checklist §5).
 */
export async function encodeMultipart(file: File): Promise<{ body: Uint8Array; contentType: string }> {
  const boundary = `----dokoon${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  const ext = /\.([a-z0-9]{1,5})$/i.exec(file.name)?.[1]?.toLowerCase() ?? 'bin';
  const enc = new TextEncoder();
  const head = enc.encode(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="upload.${ext}"\r\n` +
      `Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`,
  );
  const data = new Uint8Array(await file.arrayBuffer());
  const tail = enc.encode(`\r\n--${boundary}--\r\n`);
  const body = new Uint8Array(head.length + data.length + tail.length);
  body.set(head, 0);
  body.set(data, head.length);
  body.set(tail, head.length + data.length);
  return { body, contentType: `multipart/form-data; boundary=${boundary}` };
}
