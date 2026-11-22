import { useRef, useState } from 'react';
import { UploadTile } from '@/components/library/UploadTile';
import { acceptAttr, prepareFile, UploadError } from '@/lib/upload';
import { toast } from '@/ui/toast';
import { courierApi } from '../../api/client';
import { COURIER_DOC_RULE, uploadCourierDocument } from '../../api/documents';
import type { DocType } from '../../api/types';
import { showFullPageError } from '../../errors/fullPage';
import r from './reg.module.css';

const D_DOC = 'M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5';

export interface DocsUploaderProps {
  /** Data-driven list (`GET /c/doc-types`); never hard-coded (courier rule 6). */
  docs: DocType[];
  /** Types already sent for review. */
  uploaded: ReadonlySet<string>;
  onUploaded: (type: string) => void;
}

/**
 * Upload tiles of the registration (prototype step 2): one hidden file input; each pick is checked and
 * shrunk, then sent at once with `POST /c/documents/{type}` so nothing is lost if the wizard is left.
 */
export function DocsUploader({ docs, uploaded, onUploaded }: DocsUploaderProps) {
  const input = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState<DocType | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const pick = (doc: DocType) => {
    setCurrent(doc);
    const el = input.current;
    if (!el) return;
    el.value = '';
    el.click();
  };

  const send = async (doc: DocType, file: File) => {
    if (!doc.id) return;
    setBusy(doc.id);
    try {
      const ready = await prepareFile(file, COURIER_DOC_RULE);
      await uploadCourierDocument(courierApi(), doc.id, ready);
      onUploaded(doc.id);
      toast(`${doc.label ?? 'مدرک'} بارگذاری شد`, 'info');
    } catch (e) {
      if (e instanceof UploadError) toast(e.message, 'error');
      else if (!showFullPageError(e, () => void send(doc, file)))
        toast('بارگذاری انجام نشد؛ اتصال را بررسی کنید', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className={r.tiles}>
        {docs.map((d) => {
          const done = !!d.id && uploaded.has(d.id);
          const sub = done ? 'بارگذاری شد · تغییر' : d.required ? (d.sub ?? 'اجباری') : `اختیاری · ${d.sub ?? ''}`;
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
        accept={acceptAttr(COURIER_DOC_RULE)}
        className={r.file}
        tabIndex={-1}
        aria-hidden="true"
        data-testid="doc-file"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && current) void send(current, f);
        }}
      />
    </>
  );
}
