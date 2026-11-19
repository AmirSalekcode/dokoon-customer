import { useState } from 'react';
import { api } from '@/api/client';
import { unwrap, useApi } from '@/api/useApi';
import type { Order } from '@/api/types';
import { Button } from '@/components/base/Button';
import { EmptyState } from '@/components/library/EmptyState';
import { ErrorState } from '@/components/library/ErrorState';
import { LoadingState } from '@/components/library/LoadingState';
import { OrderCard } from '@/components/library/OrderCard';
import { TopBar } from '@/components/library/TopBar';
import type { BadgeTone } from '@/components/library/Badge';
import { isFinal, statusText } from '@/features/orders';
import { reorder } from '@/features/reorder';
import { formatNumber, toFaDigits } from '@/lib/format';
import { useNav } from '@/nav/nav';
import type { ScreenProps } from '../registry';
import s from './account.module.css';

type Tab = 'active' | 'past';
const dateFmt = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long' });

function tone(o: Order): BadgeTone {
  if (o.status === 'DELIVERED') return 'green';
  if (isFinal(o)) return 'red';
  return 'amber';
}

function itemsText(o: Order) {
  const lines = (o.lines ?? []) as unknown as { title?: string; qty?: number }[];
  return lines.map((l) => `${toFaDigits(l.qty ?? 1)}× ${l.title ?? ''}`).join('، ');
}

/** Orders (screen-specs §4 orders): active / past tabs; track or reorder. */
export function OrdersScreen(_: ScreenProps) {
  const { back, push, resetTo } = useNav.getState();
  const [tab, setTab] = useState<Tab>('active');
  const data = useApi(() => unwrap(api.GET('/orders', { params: { query: { tab } } })), [tab]);

  const list = () => {
    if (data.status === 'loading') return <LoadingState variant="list" />;
    if (data.status === 'error') return <ErrorState onRetry={data.reload} />;
    const items = data.data.items ?? [];
    if (items.length === 0)
      return (
        <EmptyState
          art="dk-mix"
          title={tab === 'active' ? 'سفارش فعالی ندارید' : 'هنوز سفارشی تحویل نگرفته‌اید'}
          text="از رستوران‌های شهر غذای دلخواهتان را سفارش دهید."
          action={<Button onClick={() => resetTo('restaurants')}>رفتن به رستوران‌ها</Button>}
        />
      );
    return (
      <div className={`${s.list} ${s.orderGrid}`}>
        {items.map((o) => {
          const delivered = o.status === 'DELIVERED';
          const active = !isFinal(o);
          return (
            <OrderCard
              key={o.id}
              order={{
                art: o.restaurant?.coverUrl,
                name: o.restaurant?.name ?? '',
                no: toFaDigits(o.number ?? ''),
                date: o.placedAt ? dateFmt.format(new Date(o.placedAt)) : '',
                statusLabel: statusText(o),
                statusTone: tone(o),
                items: itemsText(o),
                footNote: o.payMethod === 'cash' ? 'پرداخت نقدی' : 'پرداخت آنلاین',
                total: formatNumber(o.totals?.total ?? 0),
                actionLabel: active ? 'پیگیری' : delivered ? 'سفارش مجدد' : undefined,
                primary: active,
              }}
              onOpen={() => push('track', { orderId: o.id ?? '' })}
              onAction={() => (active ? push('track', { orderId: o.id ?? '' }) : void reorder(o))}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className={s.page}>
      <TopBar title="سفارش‌ها" onBack={() => back()} />
      <div className={s.tabs} role="tablist" aria-label="سفارش‌ها">
        {(
          [
            ['active', 'فعال'],
            ['past', 'گذشته'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={[s.tab, tab === id && s.on].filter(Boolean).join(' ')}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-label={tab === 'active' ? 'فعال' : 'گذشته'}>
        {list()}
      </div>
    </div>
  );
}
