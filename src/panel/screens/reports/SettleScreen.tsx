import { useEffect, useState } from 'react';
import { Button } from '@/components/base/Button';
import { ErrorState } from '@/components/library/ErrorState';
import { InfoList } from '@/components/library/InfoList';
import { LoadingState } from '@/components/library/LoadingState';
import { TopBar } from '@/components/library/TopBar';
import { Art } from '@/components/primitives/Art';
import { toFaDigits } from '@/lib/format';
import { saveFile } from '@/lib/saveFile';
import { toast } from '@/ui/toast';
import { panelApi } from '../../api/client';
import type { Settlement } from '../../api/types';
import { showFullPageError } from '../../errors/fullPage';
import { usePanelNav } from '../../nav/nav';
import { PDF_FAILED, SAVED_TEXT, settlementFileName, XLSX_FAILED } from '../../reports/names';
import { SETTLE_STATUS, settlementRows } from '../../reports/present';
import { PANEL_TOAST_MS } from '../../shell/openSwitch';
import { useReports } from '../../state/reports';
import type { PanelScreenProps } from '../StackScreens';
import s from './reports.module.css';

type Load = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; data: Settlement };

/**
 * Settlement detail (KAN-68): status, online / cash sales, Dokoon commission (rate stored in this
 * settlement, read-only), amount paid, masked Sheba. Statement as PDF (the server's invoice) or Excel (built
 * here from the server's numbers, KAN-75) for the restaurant's accounting. All numbers come from the server.
 */
export function SettleScreen({ route }: PanelScreenProps) {
  const id = route.params.id ?? '';
  const cached = useReports((st) => st.settlements.data?.find((x) => x.id === id));
  const [load, setLoad] = useState<Load>(cached ? { kind: 'ready', data: cached } : { kind: 'loading' });
  const [nonce, setNonce] = useState(0);
  const [busy, setBusy] = useState<'pdf' | 'xlsx' | null>(null);

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

  const downloadPdf = async () => {
    if (busy) return;
    setBusy('pdf');
    try {
      const { data, error } = await panelApi().GET('/r/settlements/{id}/invoice', {
        params: { path: { id } },
        parseAs: 'blob',
      });
      if (error !== undefined || !data) throw new Error('invoice');
      const blob = data as Blob;
      const how = await saveFile(
        blob.type ? blob : new Blob([blob], { type: 'application/pdf' }),
        settlementFileName(id, 'pdf'),
        'صورت‌حساب تسویه',
      );
      toast(SAVED_TEXT[how], 'info', PANEL_TOAST_MS);
    } catch (e) {
      if (!showFullPageError(e, () => void downloadPdf())) toast(PDF_FAILED, 'error', PANEL_TOAST_MS);
    } finally {
      setBusy(null);
    }
  };

  const downloadXlsx = async (data: Settlement) => {
    if (busy) return;
    setBusy('xlsx');
    try {
      // Loaded on demand: the spreadsheet writer is only needed here.
      const { settlementXlsx } = await import('../../reports/export');
      const how = await saveFile(settlementXlsx(data), settlementFileName(id, 'xlsx'), 'صورت‌حساب تسویه');
      toast(SAVED_TEXT[how], 'info', PANEL_TOAST_MS);
    } catch {
      toast(XLSX_FAILED, 'error', PANEL_TOAST_MS);
    } finally {
      setBusy(null);
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
            <section className={s.section} aria-labelledby="settle-dl">
              <h2 id="settle-dl" className={s.sh}>
                دریافت صورت‌حساب
              </h2>
              <p className={s.note}>برای حسابداری: PDF برای چاپ و بایگانی، اکسل برای جمع و گزارش‌گیری.</p>
              <div className={s.dl}>
                <Button
                  block
                  loading={busy === 'pdf'}
                  disabled={busy === 'xlsx'}
                  aria-label="دریافت صورت‌حساب PDF"
                  onClick={() => void downloadPdf()}
                >
                  PDF
                </Button>
                <Button
                  block
                  variant="secondary"
                  loading={busy === 'xlsx'}
                  disabled={busy === 'pdf'}
                  aria-label="دریافت صورت‌حساب اکسل"
                  onClick={() => void downloadXlsx(load.data)}
                >
                  اکسل
                </Button>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
