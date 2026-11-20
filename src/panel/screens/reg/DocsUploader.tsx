import { useRef, useState } from 'react';
import { UploadTile } from '@/components/library/UploadTile';
import { toast } from '@/ui/toast';
import type { DocType } from '../../api/types';
import { PANEL_TOAST_MS } from '../../shell/openSwitch';
import { acceptAttr, prepareFile, uploadFile, UploadError } from '../../upload/upload';
import r from './reg.module.css';

const D_DOC = 'M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5';

export interface DocsUploaderProps {
  /** Data-driven list (`GET /r/doc-types`); never hard-coded (restaurant rule 4). */
  docs: DocType[];
  /** docTypeId → uploadId of what is already uploaded. */
  uploaded: Record<string, string>;
  /** Called after a successful `POST /uploads`; may attach it on the server (`POST /r/docs`). */
  onUploaded: (docTypeId: string, uploadId: string) => Promise<void> | void;
}

/** Grid of upload tiles, one hidden file input; checks the server's type/size rule before uploading. */
export function DocsUploader({ docs, uploaded, onUploaded }: DocsUploaderProps) {
  const input = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState<DocType | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const pick = (doc: DocType) => {
    setCurrent(doc);
    const el = input.current;
    if (!el) return;
    el.accept = acceptAttr({ accept: doc.accept });
    el.value = '';
    el.click();
  };

  const onFile = async (file: File | undefined) => {
    const doc = current;
    if (!file || !doc?.id) return;
    setBusy(doc.id);
    try {
      const ready = await prepareFile(file, { accept: doc.accept, maxMb: doc.maxMb });
      const { id } = await uploadFile(ready);
      await onUploaded(doc.id, id);
      toast(`${doc.label} بارگذاری شد`, 'info', PANEL_TOAST_MS);
    } catch (e) {
      toast(
        e instanceof UploadError ? e.message : 'بارگذاری انجام نشد؛ اتصال را بررسی کنید',
        'error',
        PANEL_TOAST_MS,
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className={r.tiles}>
        {docs.map((d) => {
          const done = !!(d.id && uploaded[d.id]);
          const sub = done
            ? 'بارگذاری شد · تغییر'
            : d.required
              ? (d.hint ?? 'اجباری')
              : `اختیاری · ${d.hint ?? ''}`;
          return (
            <UploadTile
              key={d.id}
              label={d.label ?? ''}
              sub={sub}
              d={D_DOC}
              done={done}
              busy={busy === d.id}
              onTap={() => pick(d)}
            />
          );
        })}
      </div>
      <input
        ref={input}
        type="file"
        className={r.file}
        tabIndex={-1}
        aria-hidden="true"
        data-testid="doc-file"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
    </>
  );
}
