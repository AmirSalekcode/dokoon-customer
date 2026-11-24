import { useEffect, useRef } from 'react';
import { Button } from '@/components/base/Button';
import { EmptyState } from '@/components/library/EmptyState';
import { ErrorState } from '@/components/library/ErrorState';
import { InfoList } from '@/components/library/InfoList';
import { ListRow } from '@/components/library/ListRow';
import { LoadingState } from '@/components/library/LoadingState';
import { TopBar } from '@/components/library/TopBar';
import { HistoryRow } from '../../components/HistoryRow';
import { useMoneyLists } from '../../money/history';
import { historyRow, historyRows, settlementRow, settlementRows } from '../../money/historyPresent';
import { D_WALLET } from '../../money/present';
import { useCourierNav } from '../../nav/nav';
import type { CourierScreenProps } from '../types';
import s from './money.module.css';

const back = () => useCourierNav.getState().back();

/**
 * Trip history (KAN-99): newest first, cursor pages. The next page loads when the end of the list comes
 * into view, and the same end has a button for keyboards and screen readers. Each row opens its details.
 */
export function HistScreen() {
  const h = useMoneyLists();
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    void useMoneyLists.getState().loadHistory();
  }, []);

  const canMore = h.status === 'ready' && !!h.nextCursor && h.more === 'idle';
  const loaded = h.items.length;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !canMore || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) void useMoneyLists.getState().loadMore();
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [canMore, loaded]);

  let body;
  if (h.status === 'error')
    body = <ErrorState text="تاریخچه دریافت نشد." onRetry={() => void h.loadHistory()} />;
  else if (h.status !== 'ready') body = <LoadingState variant="list" rows={4} />;
  else if (!h.items.length)
    body = (
      <EmptyState
        art="dk-fries"
        title="هنوز سفارشی تحویل نداده‌اید"
        text="سفارش‌هایی که تحویل می‌دهید اینجا می‌آیند."
      />
    );
  else
    body = (
      <>
        <ul className={s.list} aria-label="سفارش‌های تحویل‌شده">
          {h.items.map((o) => (
            <li key={o.id}>
              <HistoryRow
                order={historyRow(o)}
                onTap={() => useCourierNav.getState().push('histd', { id: o.id })}
              />
            </li>
          ))}
        </ul>
        {h.nextCursor ? (
          <div ref={sentinel} className={s.more}>
            {h.more === 'error' ? (
              <ErrorState title="ادامه‌ی فهرست نیامد" onRetry={() => void h.loadMore()} />
            ) : (
              <Button variant="ghost" size="md" loading={h.more === 'loading'} onClick={() => void h.loadMore()}>
                نمایش سفارش‌های قدیمی‌تر
              </Button>
            )}
          </div>
        ) : (
          <p className={s.end}>پایان فهرست</p>
        )}
      </>
    );

  return (
    <div className={s.page}>
      <TopBar title="تاریخچه‌ی سفارش‌ها" onBack={back} />
      {body}
    </div>
  );
}

/** One past trip, from the loaded list (the contract has no detail endpoint yet, contract-notes 34). */
export function HistDetailScreen({ route }: CourierScreenProps) {
  const order = useMoneyLists((st) => st.items.find((o) => o.id === route.params.id));
  return (
    <div className={s.page}>
      <TopBar title={order ? `سفارش ${historyRows(order)[0].value}` : 'جزئیات سفارش'} onBack={back} />
      {order ? (
        <>
          <InfoList rows={historyRows(order).slice(1)} />
          <p className={s.note}>برای مشکل در همین سفارش با پشتیبانی دکون تماس بگیرید.</p>
        </>
      ) : (
        <EmptyState art="dk-fries" title="این سفارش پیدا نشد" text="به تاریخچه برگردید و دوباره انتخاب کنید." />
      )}
    </div>
  );
}

/** Weekly payouts (KAN-99): amount, period, paid date or «در انتظار واریز» (dot), masked Sheba. */
export function SettleScreen() {
  const list = useMoneyLists((st) => st.settlements);
  const status = useMoneyLists((st) => st.settleStatus);
  useEffect(() => {
    void useMoneyLists.getState().loadSettlements();
  }, []);

  let body;
  if (status === 'error')
    body = (
      <ErrorState
        text="فهرست تسویه‌ها دریافت نشد."
        onRetry={() => void useMoneyLists.getState().loadSettlements()}
      />
    );
  else if (!list) body = <LoadingState variant="list" rows={3} />;
  else if (!list.length)
    body = (
      <EmptyState art="dk-cake" title="هنوز تسویه‌ای نیست" text="بعد از اولین هفته‌ی کار، تسویه اینجا می‌آید." />
    );
  else
    body = (
      <div className={s.card}>
        {list.map((x) => {
          const row = settlementRow(x);
          return <ListRow
              key={x.id}
              title={row.title}
              sub={row.sub}
              meta={row.meta}
              d={D_WALLET} dot={row.dot}
              onTap={() => useCourierNav.getState().push('setd', { id: x.id })}
            />;
        })}
      </div>
    );

  return (
    <div className={s.page}>
      <TopBar title="تسویه‌حساب‌ها" onBack={back} />
      <p className={s.note}>دکون هر هفته درآمد شما را به شبای ثبت‌شده واریز می‌کند. اعداد نمونه‌اند تا قانون تسویه‌ی نقدی قطعی شود.</p>
      {body}
    </div>
  );
}

/** One payout, from the loaded list (`GET /c/settlements` has no detail endpoint). */
export function SettleDetailScreen({ route }: CourierScreenProps) {
  const x = useMoneyLists((st) => st.settlements?.find((y) => y.id === route.params.id));
  return (
    <div className={s.page}>
      <TopBar title="جزئیات تسویه" onBack={back} />
      {x ? (
        <>
          <InfoList rows={settlementRows(x)} />
          <p className={s.note}>اعداد نمونه‌اند تا قانون تسویه‌ی نقدی قطعی شود.</p>
        </>
      ) : (
        <EmptyState art="dk-cake" title="این تسویه پیدا نشد" text="به فهرست تسویه‌ها برگردید و دوباره انتخاب کنید." />
      )}
    </div>
  );
}
