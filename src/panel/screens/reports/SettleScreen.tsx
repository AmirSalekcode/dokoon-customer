import { useEffect, useState } from 'react';
import { Button } from '@/components/base/Button';
import { ErrorState } from '@/components/library/ErrorState';
import { InfoList } from '@/components/library/InfoList';
import { LoadingState } from '@/components/library/LoadingState';
import { TopBar } from '@/components/library/TopBar';
import { Art } from '@/components/primitives/Art';
import { toFaDigits } from '@/lib/format';
import { toast } from '@/ui/toast';
import { panelApi } from '../../api/client';
import type { Settlement } from '../../api/types';
import { showFullPageError } from '../../errors/fullPage';
import { usePanelNav } from '../../nav/nav';
import { SETTLE_STATUS, settlementRows } from '../../reports/present';
import { PANEL_TOAST_MS } from '../../shell/openSwitch';
import { useReports } from '../../state/reports';
import type { PanelScreenProps } from '../StackScreens';
import s from './reports.module.css';

type Load = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; data: Settlement };

/** Save a blob as a file (desktop / Android browser); the name is ASCII. */
function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Settlement detail (KAN-68): status, online / cash sales, Dokoon commission (rate stored in this
 * settlement, read-only), amount paid, masked Sheba, PDF invoice. All numbers come from the server.
 */
export function SettleScreen({ route }: PanelScreenProps) {
  const id = route.params.id ?? '';
  const cached = useReports((st) => st.settlements.data?.find((x) => x.id === id));
  const [load, setLoad] = useState<Load>(cached ? { kind: 'ready', data: cached } : { kind: 'loading' });
  const [nonce, setNonce] = useState(0);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let alive = true;
    panelApi()
      .GET('/r/settlements/{id}', { params: { path: { id } } })
      .then(
        ({ data, error }) => {
          if (!alive) return;
          if (error !== undefined || !data) setLoad((l) => (l.kind === 'ready' ? l : { kind: 'error' }));
          else setLoad({ kind: 'ready', data });
        },
        (e: unknown) => {
          if (!alive) return;
          setLoad((l) => (l.kind === 'ready' ? l : { kind: 'error' }));
          showFullPageError(e, () => setNonce((n) => n + 1));
        },
      );
    return () => {
      alive = false;
    };
  }, [id, nonce]);

  const download = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const { data, error } = await panelApi().GET('/r/settlements/{id}/invoice', {
        params: { path: { id } },
        parseAs: 'blob',
      });
      if (error !== undefined || !data) throw new Error('invoice');
      saveBlob(data as Blob, `dokoon-invoice-${id}.pdf`);
      toast('صورت‌حساب دریافت شد', 'info', PANEL_TOAST_MS);
    } catch (e) {
      if (!showFullPageError(e, () => void download()))
        toast('صورت‌حساب دریافت نشد؛ دوباره تلاش کنید', 'error', PANEL_TOAST_MS);
    } finally {
      setDownloading(false);
    }
  };

  const title = load.kind === 'ready' ? toFaDigits(load.data.title ?? 'جزئیات تسویه') : 'جزئیات تسویه';
  return (
    <div className={s.wrap}>
      <TopBar title={title} onBack={() => usePanelNav.getState().back()} />
      <div className={s.body}>
        {load.kind === 'loading' ? <LoadingState variant="list" rows={3} /> : null}
        {load.kind === 'error' ? (
          <ErrorState text="جزئیات تسویه دریافت نشد." onRetry={() => setNonce((n) => n + 1)} />
        ) : null}
        {load.kind === 'ready' ? (
          <>
            <div className={s.head}>
              <span className={s.av}>
                <Art src="dk-cake" />
              </span>
              <div>
                <h2>{SETTLE_STATUS[load.data.status ?? 'pending']}</h2>
                <p>تسویه هر هفته به شبای ثبت‌شده انجام می‌شود</p>
              </div>
            </div>
            <InfoList rows={settlementRows(load.data)} />
            <p className={s.warn}>
              درصد کمیسیون را دکون تعیین می‌کند و هر تغییر از قبل به شما اطلاع داده می‌شود؛ هر تسویه با درصد
              همان دوره حساب شده است. پول نقد سفارش‌ها را پیک می‌گیرد و دکون همراه فروش آنلاین به شما واریز
              می‌کند.
            </p>
            <Button block loading={downloading} onClick={() => void download()}>
              دریافت صورت‌حساب
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
