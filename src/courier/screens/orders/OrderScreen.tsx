import { EmptyState } from '@/components/library/EmptyState';
import { TopBar } from '@/components/library/TopBar';
import { toFaDigits } from '@/lib/format';
import type { OrderStage } from '../../api/types';
import { StageBar, type StageState } from '../../components';
import { useCourierNav } from '../../nav/nav';
import { useActiveOrder } from '../../state/active';
import s from './orders.module.css';

const STEPS: { stage: OrderStage; label: string }[] = [
  { stage: 'toRest', label: 'رستوران' },
  { stage: 'pickup', label: 'تحویل‌گیری' },
  { stage: 'toCust', label: 'مشتری' },
  { stage: 'handover', label: 'تحویل' },
];

/**
 * The active order, opened from the «سفارش در جریان» banner or after accepting an offer. This task shows
 * where the order stands; the delivery steps themselves (map, pickup checks, customer, cash) are KAN-96/97.
 */
export function OrderScreen() {
  const order = useActiveOrder((st) => st.order);
  const back = () => useCourierNav.getState().back();
  if (!order) {
    return (
      <div className={s.page}>
        <TopBar title="سفارش" onBack={back} level={1} />
        <div className={s.body}>
          <EmptyState art="dk-fries" title="سفارش فعالی ندارید" text="سفارش تحویل شده یا لغو شده است." />
        </div>
      </div>
    );
  }
  const cur = Math.max(
    0,
    STEPS.findIndex((x) => x.stage === order.stage),
  );
  const stages = STEPS.map((x, i) => ({
    label: x.label,
    state: (i < cur ? 'done' : i === cur ? 'cur' : 'todo') as StageState,
  }));
  return (
    <div className={s.page}>
      <TopBar title={`سفارش #${toFaDigits(order.no ?? '')}`} onBack={back} level={1} />
      <div className={s.body}>
        <StageBar stages={stages} />
        <EmptyState
          art="dk-fries"
          title={order.rest ?? 'سفارش در جریان'}
          text="مراحل تحویل (نقشه، تحویل‌گیری، مشتری و پرداخت) در همین صفحه اضافه می‌شود."
        />
      </div>
    </div>
  );
}
