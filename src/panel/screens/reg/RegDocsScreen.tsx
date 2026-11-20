import { useEffect, useState } from 'react';
import { ActionBar } from '@/components/library/ActionBar';
import { ErrorState } from '@/components/library/ErrorState';
import { LoadingState } from '@/components/library/LoadingState';
import { TopBar } from '@/components/library/TopBar';
import { panelApi } from '../../api/client';
import type { DocType } from '../../api/types';
import { showFullPageError } from '../../errors/fullPage';
import { usePanelNav } from '../../nav/nav';
import { UploadError } from '../../upload/upload';
import type { PanelScreenProps } from '../StackScreens';
import { DocsUploader } from './DocsUploader';
import r from './reg.module.css';

type Load = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; list: DocType[] };

/**
 * «مدرک بیشتری لازم است» (needs_docs): upload only the documents the server asked for
 * (`params.ids`), each attached right away with `POST /r/docs`; then back to a fresh status.
 */
export function RegDocsScreen({ route }: PanelScreenProps) {
  const ids = (route.params.ids ?? '').split(',').filter(Boolean);
  const idsKey = ids.join(',');
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [nonce, setNonce] = useState(0);
  const [uploaded, setUploaded] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    const want = idsKey.split(',').filter(Boolean);
    panelApi()
      .GET('/r/doc-types')
      .then(
        ({ data, error }) => {
          if (!alive) return;
          if (error !== undefined || !data) setLoad({ kind: 'error' });
          else
            setLoad({
              kind: 'ready',
              list: data.filter((d) => d.id && (!want.length || want.includes(d.id))),
            });
        },
        (e: unknown) => {
          if (!alive) return;
          setLoad({ kind: 'error' });
          showFullPageError(e, () => setNonce((n) => n + 1));
        },
      );
    return () => {
      alive = false;
    };
  }, [idsKey, nonce]);

  const attach = async (docTypeId: string, uploadId: string) => {
    const { error } = await panelApi().POST('/r/docs', { body: { docTypeId, uploadId } });
    if (error !== undefined) throw new UploadError('ثبت مدرک انجام نشد؛ دوباره تلاش کنید');
    setUploaded((u) => ({ ...u, [docTypeId]: uploadId }));
  };

  const list = load.kind === 'ready' ? load.list : [];
  const done = list.length > 0 && list.every((d) => d.id && uploaded[d.id]);

  return (
    <div className={r.wrap}>
      <TopBar title="بارگذاری مدارک" onBack={() => usePanelNav.getState().back()} />
      <div className={r.body}>
        <p className={r.note}>دکون برای تأیید رستوران، این مدارک را لازم دارد.</p>
        {load.kind === 'loading' ? <LoadingState variant="list" rows={2} /> : null}
        {load.kind === 'error' ? (
          <ErrorState text="فهرست مدارک دریافت نشد." onRetry={() => setNonce((n) => n + 1)} />
        ) : null}
        {load.kind === 'ready' ? <DocsUploader docs={list} uploaded={uploaded} onUploaded={attach} /> : null}
      </div>
      <div className={r.dock}>
        <ActionBar
          label="ارسال برای بررسی"
          disabled={!done}
          onTap={() => usePanelNav.getState().resetTo('reg-status')}
        />
      </div>
    </div>
  );
}
