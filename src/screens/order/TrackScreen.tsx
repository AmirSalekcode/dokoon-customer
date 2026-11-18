import { api } from '@/api/client';
import { useApi } from '@/api/useApi';
import { Button } from '@/components/base/Button';
import { ContactRow } from '@/components/library/ContactRow';
import { ErrorState } from '@/components/library/ErrorState';
import { InfoList } from '@/components/library/InfoList';
import { LoadingState } from '@/components/library/LoadingState';
import { PriceSummary } from '@/components/library/PriceSummary';
import { StepBar } from '@/components/library/StepBar';
import { TopBar } from '@/components/library/TopBar';
import { summaryRows } from '@/features/checkout';
import { STEP_LABELS, statusText, useOrder } from '@/features/orders';
import { formatMoney, formatPhone, toFaDigits } from '@/lib/format';
import { useNav } from '@/nav/nav';
import type { ScreenProps } from '../registry';
import s from './order.module.css';

/** Contract gap (docs/contract-notes.md #2): Order.lines items are untyped. */
interface OrderLineVM {
  foodId?: string;
  title?: string;
  qty?: number;
  unitPrice?: number;
  total?: number;
}

const ACTIVE = new Set(['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'ON_THE_WAY', 'DELIVERED']);

function payText(method?: string, status?: string) {
  if (method === 'cash') return status === 'cash_collected' ? 'نقدی (پرداخت شد)' : 'نقدی هنگام تحویل';
  if (status === 'refunded') return 'آنلاین (بازگشت وجه)';
  return status === 'paid' ? 'آنلاین (پرداخت شده)' : 'آنلاین';
}

/** Order tracking (screen-specs §4 track). Live status by polling; live courier map is out of scope. */
export function TrackScreen({ route }: ScreenProps) {
  const orderId = route.params.orderId ?? '';
  const { back, push } = useNav.getState();
  const { order: o, error, reload } = useOrder(orderId, route.key);
  const restaurantId = o?.restaurant?.id ?? '';
  const rest = useApi(
    async () => {
      if (!restaurantId) return null;
      const { data } = await api.GET('/restaurants/{id}', { params: { path: { id: restaurantId } } });
      return data ?? null;
    },
    [restaurantId],
    { fullPageErrors: false },
  );

  const body = () => {
    if (!o) return error ? <ErrorState onRetry={reload} /> : <LoadingState variant="list" />;
    const step = o.step ?? 0;
    const active = ACTIVE.has(o.status ?? '');
    const lines = (o.lines ?? []) as unknown as OrderLineVM[];
    const phone = rest.status === 'success' ? rest.data?.phone : undefined;
    return (
      <div className={s.body}>
        <div className={s.head}>
          <small>سفارش {toFaDigits(o.number ?? '')}</small>
          <h1>{o.restaurant?.name}</h1>
        </div>
        <p className={[s.status, !active && s.off].filter(Boolean).join(' ')} role="status">
          {statusText(o)}
        </p>
        {active ? (
          <StepBar
            steps={STEP_LABELS.map((label, i) => ({
              label,
              state: i < step || step === 4 ? 'done' : i === step ? 'cur' : 'todo',
            }))}
          />
        ) : null}
        {active && step < 4 && o.etaMin != null && o.etaMax != null ? (
          <p className={s.eta}>
            زمان تقریبی تحویل: {toFaDigits(o.etaMin)} تا {toFaDigits(o.etaMax)} دقیقه
          </p>
        ) : null}

        <section aria-label="تماس" className={s.stack}>
          {phone ? (
            <ContactRow title={o.restaurant?.name ?? ''} sub={toFaDigits(phone)} href={`tel:${phone}`} />
          ) : null}
          {o.courier?.phone && step >= 3 ? (
            <ContactRow
              title={`پیک: ${o.courier.name ?? ''}`}
              sub={formatPhone(o.courier.phone)}
              art="dk-mix"
              href={`tel:${o.courier.phone}`}
            />
          ) : null}
        </section>

        <section aria-label="جزئیات سفارش">
          <InfoList
            rows={[
              { label: 'آدرس تحویل', value: o.address?.fullText ?? '—' },
              { label: 'روش پرداخت', value: payText(o.payMethod, o.paymentStatus) },
              ...(o.note ? [{ label: 'یادداشت', value: o.note }] : []),
            ]}
          />
        </section>

        <section aria-label="اقلام سفارش" className={s.stack}>
          <ul className={s.lines}>
            {lines.map((l, i) => (
              <li key={`${l.foodId}-${i}`}>
                <span>
                  {toFaDigits(l.qty ?? 1)}× {l.title}
                </span>
                <span>{formatMoney(l.total ?? (l.unitPrice ?? 0) * (l.qty ?? 1))}</span>
              </li>
            ))}
          </ul>
          <PriceSummary
            rows={summaryRows({
              itemsTotal: o.totals?.items,
              deliveryFee: o.totals?.fee,
              discount: o.totals?.discount,
            })}
            totalLabel="مبلغ کل"
            totalValue={formatMoney(o.totals?.total ?? 0)}
          />
        </section>

        <div className={s.acts}>
          {o.canRate ? (
            <Button size="lg" block onClick={() => push('rateorder', { orderId })}>
              امتیاز به سفارش
            </Button>
          ) : null}
          {o.canCancel ? (
            <Button size="lg" block variant="danger" onClick={() => push('cancel', { orderId })}>
              لغو سفارش
            </Button>
          ) : null}
          <Button size="lg" block variant="secondary" onClick={() => push('report', { orderId })}>
            گزارش مشکل
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className={s.page}>
      <TopBar title="پیگیری سفارش" onBack={() => back()} />
      {body()}
    </div>
  );
}
