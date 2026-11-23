import { useEffect } from 'react';
import { BarChart } from '@/components/library/BarChart';
import { ErrorState } from '@/components/library/ErrorState';
import { LoadingState } from '@/components/library/LoadingState';
import { SegTabs } from '@/components/library/SegTabs';
import { StatCard } from '@/components/library/StatCard';
import { TopBar } from '@/components/library/TopBar';
import type { EarningsPeriod } from '../../api/types';
import { EarnBalance } from '../../components/EarnBalance';
import { useEarnings } from '../../money/earnings';
import { balanceView, CHART_TITLE, chartBars, PERIOD_LABEL, PERIODS, statCards } from '../../money/present';
import s from './earn.module.css';

function PeriodView({ period }: { period: EarningsPeriod }) {
  const load = useEarnings((st) => st.byPeriod[period]);
  // Every visit refreshes the period (a trip just delivered must show); the old numbers stay meanwhile.
  useEffect(() => {
    if (useEarnings.getState().byPeriod[period].status !== 'loading') void useEarnings.getState().load(period);
  }, [period]);

  const e = load.data;
  if (!e && load.status === 'error')
    return <ErrorState text="درآمد دریافت نشد." onRetry={() => void useEarnings.getState().load(period)} />;
  if (!e) return <LoadingState variant="list" rows={3} />;
  return (
    <>
      <EarnBalance {...balanceView(e)} />
      <div className={s.stats}>
        {statCards(e).map((c) => (
          <StatCard key={c.key} label={c.label} value={c.value} sub={c.sub} d={c.d} />
        ))}
      </div>
      <BarChart
        title={`${CHART_TITLE[period]} (تومان)`}
        bars={chartBars(e)}
        empty={`${PERIOD_LABEL[period]} هنوز سفارشی تحویل نداده‌اید`}
      />
    </>
  );
}

/**
 * Earnings tab (KAN-98, courier screen specs «درآمد»): period tabs (today / week / month, today first and
 * kept while moving to history and back), the balance card, four stat cards and the bar chart. All numbers
 * are the server's; the balance is labelled as a sample until the cash settlement rule is decided.
 */
export function EarnScreen() {
  const period = useEarnings((st) => st.period);
  return (
    <div className={s.page}>
      <TopBar title="درآمد" />
      <SegTabs
        label="بازه‌ی درآمد"
        items={PERIODS.map((p) => ({ key: p, label: PERIOD_LABEL[p] }))}
        active={period}
        onPick={(k) => useEarnings.getState().setPeriod(k as EarningsPeriod)}
      />
      <PeriodView key={period} period={period} />
    </div>
  );
}
