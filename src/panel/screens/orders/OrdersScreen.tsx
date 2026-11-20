import { useEffect, useRef } from 'react';
import { Button } from '@/components/base/Button';
import { EmptyState } from '@/components/library/EmptyState';
import { ErrorState } from '@/components/library/ErrorState';
import { FilterChip } from '@/components/library/FilterChip';
import { LoadingState } from '@/components/library/LoadingState';
import { SegTabs } from '@/components/library/SegTabs';
import { toFaDigits } from '@/lib/format';
import type { Order } from '../../api/types';
import { OrderTile } from '../../components/OrderTile';
import { runOrderAction } from '../../orders/actions';
import { useNow, useWide } from '../../orders/hooks';
import { primaryAction, sortLive, tileView } from '../../orders/present';
import { onLiveEvent } from '../../realtime/live';
import { reopen } from '../../shell/openSwitch';
import { RANGE_LABEL, RANGES, useHistory } from '../../state/history';
import { countByTab, TAB_OF, useOrders } from '../../state/orders';
import { useOrdersUi, type OrdersTab } from '../../state/ordersUi';
import { useRestaurant } from '../../state/restaurant';
import s from './orders.module.css';

const TAB_LABEL: Record<OrdersTab, string> = {
  new: 'جدید',
  prep: 'در حال آماده‌سازی',
  ready_or_way: 'آماده / در مسیر',
  history: 'تاریخچه',
};
const EMPTY_TITLE: Record<OrdersTab, string> = {
  new: 'سفارش جدیدی نیست',
  prep: 'سفارشی در حال آماده‌سازی نیست',
  ready_or_way: 'سفارشی در انتظار پیک یا در مسیر نیست',
  history: 'در این بازه سفارشی نبود',
};

/** A tile of the list with its main action. */
function Tile({ order, now }: { order: Order; now: number }) {
  const busy = useOrders((st) => !!st.busy[order.id!]);
  const selectedId = useOrdersUi((st) => st.selectedId);
  const select = useOrdersUi((st) => st.select);
  const wide = useWide();
  const act = primaryAction(order);
  // Accept needs the prep-time sheet (KAN-64).
  const shown = act && act.kind !== 'accept' ? act : null;
  return (
    <OrderTile
      order={tileView(order, now)}
      actionLabel={shown?.label ?? ''}
      actionTone={shown?.tone}
      busy={busy}
      selected={wide && selectedId === order.id}
      onOpen={() => select(order.id!)}
      onAction={shown ? () => void runOrderAction(order.id!, shown.kind) : undefined}
    />
  );
}

function LiveList({ tab }: { tab: Exclude<OrdersTab, 'history'> }) {
  const byId = useOrders((st) => st.byId);
  const status = useOrders((st) => st.status);
  const sync = useOrders((st) => st.sync);
  const open = useRestaurant((st) => st.profile?.open ?? true);
  const list = sortLive(Object.values(byId).filter((o) => o.status && TAB_OF[o.status] === tab));
  // New orders show a seconds countdown; the other tabs only minutes.
  const now = useNow(tab === 'new' && list.length ? 1000 : 30_000);

  if (!list.length && (status === 'idle' || status === 'loading'))
    return <LoadingState variant="list" rows={3} />;
  if (!list.length && status === 'error') return <ErrorState onRetry={() => void sync()} />;
  if (!list.length)
    return (
      <EmptyState
        art="dk-all"
        title={EMPTY_TITLE[tab]}
        text={
          open
            ? 'همین که سفارشی برسد، با صدا به شما خبر می‌دهیم.'
            : 'رستوران بسته است؛ برای دریافت سفارش آن را باز کنید.'
        }
      />
    );
  return (
    <ul className={s.list} aria-label={`سفارش‌های ${TAB_LABEL[tab]}`}>
      {list.map((o) => (
        <li key={o.id}>
          <Tile order={o} now={now} />
        </li>
      ))}
    </ul>
  );
}

function HistoryList() {
  const h = useHistory();
  const now = useNow(60_000);
  const sentinel = useRef<HTMLDivElement>(null);
  const { status, stale, load } = h;

  useEffect(() => {
    if (status === 'idle') void load();
    else if (stale) void load({ silent: true });
  }, [status, stale, load]);

  // Infinite scroll: the next page loads when the end of the list comes into view.
  const canMore = h.status === 'ready' && !!h.nextCursor && h.more === 'idle';
  const loaded = h.items.length;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !canMore || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) void useHistory.getState().loadMore();
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [canMore, loaded]);

  return (
    <>
      <div className={s.chips} role="group" aria-label="بازه‌ی تاریخچه">
        {RANGES.map((r) => (
          <FilterChip key={r} label={RANGE_LABEL[r]} selected={h.range === r} onPick={() => h.setRange(r)} />
        ))}
      </div>
      {h.status === 'loading' || h.status === 'idle' ? (
        <LoadingState variant="list" rows={3} />
      ) : h.status === 'error' ? (
        <ErrorState onRetry={() => void h.load()} />
      ) : !h.items.length ? (
        <EmptyState art="dk-all" title={EMPTY_TITLE.history} text="بازه‌ی بزرگ‌تری را انتخاب کنید." />
      ) : (
        <>
          <ul className={s.list} aria-label="تاریخچه‌ی سفارش‌ها">
            {h.items.map((o) => (
              <li key={o.id}>
                <Tile order={o} now={now} />
              </li>
            ))}
          </ul>
          {h.nextCursor ? (
            <div ref={sentinel} className={s.more}>
              {h.more === 'error' ? (
                <ErrorState title="ادامه‌ی فهرست نیامد" onRetry={() => void h.loadMore()} />
              ) : (
                <Button
                  variant="ghost"
                  size="md"
                  loading={h.more === 'loading'}
                  onClick={() => void h.loadMore()}
                >
                  نمایش سفارش‌های قدیمی‌تر
                </Button>
              )}
            </div>
          ) : (
            <p className={s.end}>پایان فهرست</p>
          )}
        </>
      )}
    </>
  );
}

/** Orders tab (KAN-63): status tabs with counters, live lists, history with date chips + infinite scroll. */
export function OrdersScreen() {
  const open = useRestaurant((st) => st.profile?.open ?? true);
  const switching = useRestaurant((st) => st.switching);
  const byId = useOrders((st) => st.byId);
  const tab = useOrdersUi((st) => st.tab);
  const setTab = useOrdersUi((st) => st.setTab);
  const c = countByTab(byId);

  // Orders that finish (delivered, cancelled, expired…) belong to the history now.
  useEffect(
    () =>
      onLiveEvent((m) => {
        if (m.event === 'order.cancelled' || m.event === 'order.expired') useHistory.getState().invalidate();
        if (m.event === 'order.updated' && m.data.status && !(m.data.status in TAB_OF))
          useHistory.getState().invalidate();
      }),
    [],
  );

  const count = (n: number) => (n ? toFaDigits(n) : '');
  return (
    <div className={s.page}>
      {!open ? (
        <div className={s.closed}>
          <p>رستوران بسته است؛ سفارش جدید دریافت نمی‌کنید.</p>
          <Button size="md" loading={switching} onClick={() => void reopen()} aria-label="باز کردن رستوران">
            باز کردن
          </Button>
        </div>
      ) : null}
      <div className={s.tabs}>
        <SegTabs
          label="وضعیت سفارش‌ها"
          active={tab}
          onPick={(k) => setTab(k as OrdersTab)}
          items={[
            { key: 'new', label: TAB_LABEL.new, count: count(c.new), hot: c.new > 0 },
            { key: 'prep', label: TAB_LABEL.prep, count: count(c.prep) },
            { key: 'ready_or_way', label: TAB_LABEL.ready_or_way, count: count(c.ready_or_way) },
            { key: 'history', label: TAB_LABEL.history },
          ]}
        />
      </div>
      <div className={s.split}>
        <section aria-label="فهرست سفارش‌ها" className={s.col}>
          {tab === 'history' ? <HistoryList /> : <LiveList tab={tab} />}
        </section>
        <section className={s.detail} aria-label="جزئیات سفارش">
          <EmptyState
            art="dk-kebab"
            title="سفارشی انتخاب نشده"
            text="یکی از سفارش‌ها را از فهرست انتخاب کنید."
          />
        </section>
      </div>
    </div>
  );
}
