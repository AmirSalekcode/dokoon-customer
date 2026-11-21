import { useEffect } from 'react';
import { BarChart } from '@/components/library/BarChart';
import { EmptyState } from '@/components/library/EmptyState';
import { ErrorState } from '@/components/library/ErrorState';
import { InfoList } from '@/components/library/InfoList';
import { ListRow } from '@/components/library/ListRow';
import { LoadingState } from '@/components/library/LoadingState';
import { SegTabs } from '@/components/library/SegTabs';
import { StatCard } from '@/components/library/StatCard';
import { usePanelNav } from '../../nav/nav';
import {
  CHART_TITLE,
  chartBars,
  D_SETTLE,
  settlementRow,
  statCards,
  topFoodRows,
} from '../../reports/present';
import { PERIOD_LABEL, PERIODS, useReports, type Period } from '../../state/reports';
import s from './reports.module.css';

function PeriodReport({ period }: { period: Period }) {
  const load = useReports((st) => st.reports[period]);
  useEffect(() => {
    const st = useReports.getState().reports[period].status;
    if (st === 'idle' || st === 'error') void useReports.getState().loadReport(period);
  }, [period]);

  const r = load.data;
  if (!r && load.status === 'error')
    return (
      <ErrorState text="گزارش دریافت نشد." onRetry={() => void useReports.getState().loadReport(period)} />
    );
  if (!r) return <LoadingState variant="list" rows={3} />;
  const top = topFoodRows(r);
  return (
    <>
      <div className={s.stats}>
        {statCards(r).map((c) => (
          <StatCard key={c.key} label={c.label} value={c.value} sub={c.sub} d={c.d} />
        ))}
      </div>
      <BarChart title={CHART_TITLE[period]} bars={chartBars(r)} empty="در این بازه سفارشی نبود" />
      <section className={s.section} aria-labelledby="rep-top">
        <h2 id="rep-top" className={s.sh}>
          پرفروش‌ترین غذاها
        </h2>
        {top.length ? (
          <InfoList rows={top} />
        ) : (
          <p className={s.note}>در این بازه هنوز فروشی ثبت نشده است.</p>
        )}
      </section>
    </>
  );
}

function Settlements() {
  const load = useReports((st) => st.settlements);
  useEffect(() => {
    if (useReports.getState().settlements.status !== 'loading') void useReports.getState().loadSettlements();
  }, []);
  const list = load.data;
  let body;
  if (!list && load.status === 'error')
    body = (
      <ErrorState
        text="فهرست تسویه‌ها دریافت نشد."
        onRetry={() => void useReports.getState().loadSettlements()}
      />
    );
  else if (!list) body = <LoadingState variant="list" rows={2} />;
  else if (!list.length)
    body = (
      <EmptyState
        art="dk-cake"
        title="هنوز تسویه‌ای نیست"
        text="بعد از اولین هفته‌ی فروش، تسویه اینجا می‌آید."
      />
    );
  else
    body = (
      <div className={s.card}>
        {list.map((x) => {
          const row = settlementRow(x);
          return (
            <ListRow
              key={x.id}
              title={row.title}
              sub={row.sub}
              meta={row.meta}
              d={D_SETTLE}
              dot={row.dot}
              onTap={() => usePanelNav.getState().push('settle', { id: x.id! })}
            />
          );
        })}
      </div>
    );
  return (
    <section className={s.section} aria-labelledby="rep-settle">
      <h2 id="rep-settle" className={s.sh}>
        تسویه‌حساب‌ها
      </h2>
      <p className={s.note}>
        سهم رستوران از سفارش‌های آنلاین و نقدی هر هفته به حساب شبا واریز می‌شود. پول نقد را پیک از مشتری
        می‌گیرد و دکون در تسویه به شما می‌پردازد.
      </p>
      {body}
    </section>
  );
}

/** Reports tab (KAN-68): period tabs, 4 stat cards, bar chart, best sellers, settlements. */
export function ReportsScreen() {
  const period = useReports((st) => st.period);
  return (
    <div className={s.page}>
      <div className={s.tabs}>
        <SegTabs
          label="بازه‌ی گزارش"
          items={PERIODS.map((p) => ({ key: p, label: PERIOD_LABEL[p] }))}
          active={period}
          onPick={(k) => useReports.getState().setPeriod(k as Period)}
        />
      </div>
      <div className={s.grid}>
        <div className={s.col}>
          <PeriodReport key={period} period={period} />
        </div>
        <div className={s.col}>
          <Settlements />
        </div>
      </div>
    </div>
  );
}
