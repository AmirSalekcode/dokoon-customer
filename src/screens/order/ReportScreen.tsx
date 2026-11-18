import { useEffect, useId, useRef, useState } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/base/Button';
import { SelectCard } from '@/components/library/SelectCard';
import { TopBar } from '@/components/library/TopBar';
import { Icon } from '@/components/primitives/Icon';
import { toFaDigits } from '@/lib/format';
import { useNav } from '@/nav/nav';
import { toast } from '@/ui/toast';
import type { ScreenProps } from '../registry';
import s from './order.module.css';

/** Contract has `typeId` but no list endpoint: ids are agreed client-side (contract-notes #8). */
export const REPORT_TYPES = [
  { id: 'missing', title: 'غذا کامل نبود' },
  { id: 'wrong', title: 'غذای اشتباه رسید' },
  { id: 'late', title: 'تأخیر در تحویل' },
  { id: 'quality', title: 'کیفیت غذا مناسب نبود' },
  { id: 'other', title: 'سایر' },
];

/** Upload limits from the contract (`POST /uploads`: jpeg/png/webp, max 5MB). */
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const PHOTO_MAX_COUNT = 3;

interface Photo {
  id: string;
  /** Local preview (object URL), when the platform supports it. */
  preview?: string;
}

/** Upload failure with a Persian, user-facing message (from the server or a default). */
class UploadError extends Error {}

/** Uploads one image; resolves to the upload id or throws UploadError / a network error. */
async function uploadPhoto(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const { data, error } = await api.POST('/uploads', {
    body: form as never,
    bodySerializer: (b: unknown) => b as FormData,
  });
  if (error !== undefined || !data?.id) {
    throw new UploadError((error as { message?: string } | undefined)?.message || 'بارگذاری عکس انجام نشد.');
  }
  return data.id;
}

/**
 * Report a problem (screen-specs §4 report): type, text and up to three optional photos. Each photo
 * is uploaded on pick (POST /uploads) and sent as `photoUploadIds` (contract-notes #8).
 */
export function ReportScreen({ route }: ScreenProps) {
  const orderId = route.params.orderId ?? '';
  const back = useNav((st) => st.back);
  const [type, setType] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const textId = useId();
  const fileId = useId();
  const previews = useRef<string[]>([]);
  const ok = !!type && text.trim().length >= 3 && !busy && !uploading;

  useEffect(
    () => () => {
      if (typeof URL.revokeObjectURL === 'function') previews.current.forEach((u) => URL.revokeObjectURL(u));
    },
    [],
  );

  const addPhoto = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    if (!PHOTO_TYPES.includes(file.type)) {
      setError('فقط عکس jpeg، png یا webp قابل ارسال است.');
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      setError(`حجم عکس باید کمتر از ${toFaDigits(5)} مگابایت باشد`);
      return;
    }
    setUploading(true);
    try {
      const id = await uploadPhoto(file);
      const preview = typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : undefined;
      if (preview) previews.current.push(preview);
      setPhotos((prev) => [...prev, { id, preview }]);
    } catch (e) {
      setError(e instanceof UploadError ? e.message : 'اتصال برقرار نشد. دوباره تلاش کنید.');
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const { error: err } = await api.POST('/orders/{id}/report', {
        params: { path: { id: orderId } },
        body: {
          typeId: type,
          text: text.trim(),
          ...(photos.length ? { photoUploadIds: photos.map((p) => p.id) } : {}),
        },
      });
      if (err !== undefined) {
        setError((err as { message?: string }).message || 'ثبت گزارش انجام نشد.');
        return;
      }
      toast('گزارش شما ثبت شد', 'success');
      back();
    } catch {
      setError('اتصال برقرار نشد. دوباره تلاش کنید.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={s.page}>
      <TopBar title="گزارش مشکل" onBack={() => back()} />
      <div className={s.body}>
        <h2 id="report-h" className={s.h}>
          چه مشکلی پیش آمد؟
        </h2>
        <div role="radiogroup" aria-labelledby="report-h" className={s.stack}>
          {REPORT_TYPES.map((r) => (
            <SelectCard
              key={r.id}
              radio
              title={r.title}
              selected={type === r.id}
              onPick={() => setType(r.id)}
            />
          ))}
        </div>
        <label htmlFor={textId} className={s.label}>
          توضیح مشکل
        </label>
        <textarea
          id={textId}
          className={s.text}
          maxLength={500}
          placeholder="مشکل را کوتاه توضیح دهید"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {photos.length ? (
          <ul className={s.photos} aria-label="عکس‌ها">
            {photos.map((p, i) => (
              <li key={p.id} className={s.photo}>
                {p.preview ? <img src={p.preview} alt={`عکس ${toFaDigits(i + 1)}`} /> : <Icon name="check" />}
                <button
                  type="button"
                  className={s.photoDel}
                  aria-label={`حذف عکس ${toFaDigits(i + 1)}`}
                  onClick={() => setPhotos((prev) => prev.filter((x) => x.id !== p.id))}
                >
                  <Icon name="close" size={16} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {photos.length < PHOTO_MAX_COUNT ? (
          <>
            <input
              id={fileId}
              type="file"
              accept={PHOTO_TYPES.join(',')}
              className="visually-hidden"
              disabled={uploading}
              onChange={(e) => {
                const input = e.currentTarget;
                void addPhoto(input.files?.[0]).finally(() => {
                  input.value = '';
                });
              }}
            />
            <label htmlFor={fileId} className={s.addPhoto} aria-busy={uploading || undefined}>
              <Icon name="plus" size={20} />
              <span>{uploading ? 'در حال بارگذاری عکس…' : 'افزودن عکس (اختیاری)'}</span>
            </label>
          </>
        ) : null}
        {error ? (
          <p className={s.alert} role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <div className={s.dock}>
        <Button size="lg" block disabled={!ok} onClick={() => void submit()}>
          ثبت گزارش
        </Button>
      </div>
    </div>
  );
}
