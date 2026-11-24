import { useState } from 'react';
import { ActionBar } from '@/components/library/ActionBar';
import { EmptyState } from '@/components/library/EmptyState';
import { TopBar } from '@/components/library/TopBar';
import { formatDecimal, formatMoney, normalizeDigits, toFaDigits } from '@/lib/format';
import type { MapProviderId } from '@/providers/map/MapProvider';
import { toast } from '@/ui/toast';
import type { ActiveOrder, OrderStage } from '../../api/types';
import {
  CashPanel,
  ItemCheckRow,
  PlaceCard,
  RouteMap,
  StageBar,
  TripSummary,
  type StageState,
} from '../../components';
import { openNavigation } from '../../maps/navLinks';
import { useCourierNav } from '../../nav/nav';
import {
  advance,
  deliver,
  ISSUE_REASONS,
  reportIssue,
  reportUnreachable,
  withdraw,
  WITHDRAW_REASONS,
  type NextStage,
} from '../../order/actions';
import type { SheetSpec } from '../../shell/overlays';
import { useActiveOrder, type TripDone, type TripInfo } from '../../state/active';
import { COURIER_TOAST_MS, useOnline } from '../../state/online';
import s from './order.module.css';

const STEPS: { stage: OrderStage; label: string }[] = [
  { stage: 'toRest', label: 'رستوران' },
  { stage: 'pickup', label: 'تحویل‌گیری' },
  { stage: 'toCust', label: 'مشتری' },
  { stage: 'handover', label: 'تحویل' },
];

/** The bottom button of each step and the step it moves to. */
const DOCK: Partial<Record<OrderStage, { label: string; next: NextStage }>> = {
  toRest: { label: 'به رستوران رسیدم', next: 'pickup' },
  pickup: { label: 'سفارش را تحویل گرفتم', next: 'toCust' },
  toCust: { label: 'به مشتری رسیدم', next: 'handover' },
};

const UNKNOWN = '—';
const km = (n?: number) => (typeof n === 'number' ? `${formatDecimal(n)} کیلومتر` : UNKNOWN);

function stagesOf(stage: OrderStage) {
  const cur = Math.max(
    0,
    STEPS.findIndex((x) => x.stage === stage),
  );
  return STEPS.map((x, i) => ({
    label: x.label,
    state: (i < cur ? 'done' : i === cur ? 'cur' : 'todo') as StageState,
  }));
}

function call(phone: string | undefined) {
  if (!phone) return;
  // The number the server gives; a Dokoon proxy number replaces it once decided (open decision, note 36).
  window.location.href = `tel:${phone}`;
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast('آدرس کپی شد', 'info', COURIER_TOAST_MS);
  } catch {
    toast('کپی نشد؛ آدرس را از روی کارت بخوانید', 'warn', COURIER_TOAST_MS);
  }
}

function navigate(provider: MapProviderId, address: string | undefined) {
  if (!openNavigation(provider, { address: address ?? '' }))
    toast('مسیریاب باز نشد؛ آدرس را کپی کنید', 'warn', COURIER_TOAST_MS);
}

function askReason(spec: Omit<SheetSpec, 'reasons'> & { reasons: string[] }) {
  useCourierNav.getState().openOverlay({
    kind: 'sheet',
    props: { ...spec, reasons: spec.reasons.map((r) => ({ id: r, label: r })) } as unknown as Record<string, unknown>,
  });
}

const askWithdraw = () =>
  askReason({
    title: 'انصراف از سفارش',
    text: 'سفارش به پیک دیگری داده می‌شود. فقط تا پیش از تحویل گرفتن غذا ممکن است.',
    confirmLabel: 'انصراف از سفارش',
    reasons: WITHDRAW_REASONS,
    onConfirm: (r) => {
      useCourierNav.getState().closeOverlay();
      void withdraw(r);
    },
  });

const askIssue = () =>
  askReason({
    title: 'مشکل در سفارش',
    text: 'مشکل برای پشتیبانی ثبت می‌شود و سفارش ادامه پیدا می‌کند.',
    confirmLabel: 'ثبت مشکل',
    reasons: ISSUE_REASONS,
    onConfirm: (r) => {
      useCourierNav.getState().closeOverlay();
      void reportIssue(r);
    },
  });

function RestaurantLeg({ order, trip, tracking }: { order: ActiveOrder; trip: TripInfo | null; tracking: boolean }) {
  return (
    <div className={s.split}>
      <RouteMap
        label="تا رستوران"
        distText={km(trip?.kmToRest)}
        tracking={tracking}
        onNeshan={() => navigate('neshan', order.restAddress)}
        onBalad={() => navigate('balad', order.restAddress)}
      />
      <PlaceCard
        title={order.rest ?? ''}
        kind="رستوران"
        address={order.restAddress ?? ''}
        canCall={!!order.restPhone}
        onCall={() => call(order.restPhone)}
        onCopy={() => void copy(order.restAddress ?? '')}
      />
    </div>
  );
}

function Pickup({ order }: { order: ActiveOrder }) {
  const checked = useActiveOrder((st) => st.checked);
  const toggle = useActiveOrder((st) => st.toggleItem);
  return (
    <section className={s.items} aria-labelledby="pickup-title">
      <h2 id="pickup-title" className={s.title}>
        غذاها را تطبیق دهید
      </h2>
      <p className={s.note}>غذاها را با فهرست تطبیق دهید و هر کدام را تیک بزنید.</p>
      {(order.items ?? []).map((it) => (
        <ItemCheckRow
          key={it.id}
          item={{ q: toFaDigits(it.q ?? 1), name: it.name ?? '', opt: it.opt, checked: checked.includes(it.id ?? '') }}
          onToggle={() => toggle(it.id ?? '')}
        />
      ))}
    </section>
  );
}

function CustomerLeg({ order, trip, tracking }: { order: ActiveOrder; trip: TripInfo | null; tracking: boolean }) {
  const reported = useActiveOrder((st) => st.reported);
  return (
    <div className={s.split}>
      <RouteMap
        label="تا مشتری"
        distText={km(trip?.km)}
        tracking={tracking}
        onNeshan={() => navigate('neshan', order.custAddress)}
        onBalad={() => navigate('balad', order.custAddress)}
      />
      <div className={s.side}>
        <CustomerCard order={order} />
        {reported ? (
          <p className={s.warn} role="status">
            گزارش برای مدیر شهر ارسال شد. منتظر راهنمایی او بمانید؛ سفارش باز می‌ماند.
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Name, address, note and phone of the customer: only between pickup and delivery (courier rule 2). */
function CustomerCard({ order }: { order: ActiveOrder }) {
  return (
    <PlaceCard
      title={order.cust ?? ''}
      kind="مشتری"
      address={order.custAddress ?? ''}
      extra={order.note}
      canCall={!!order.custPhone}
      onCall={() => call(order.custPhone)}
      onCopy={() => void copy(order.custAddress ?? '')}
    />
  );
}

/** Digits only (Persian / Arabic digits accepted) as an integer toman amount; empty = not entered. */
export const parseToman = (raw: string): number | undefined => {
  const digits = normalizeDigits(raw).replace(/[^0-9]/g, '');
  return digits ? Number(digits) : undefined;
};

/** «۴۱۲۰۰۰» → «۴۱۲٬۰۰۰» while typing. */
const groupFa = (n: number) => toFaDigits(String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '٬'));

function Handover({ order, cash, setCash }: { order: ActiveOrder; cash: string; setCash: (v: string) => void }) {
  if (!order.cash) {
    return (
      <>
        <CustomerCard order={order} />
        <p className={s.note}>پرداخت به‌صورت آنلاین انجام شده است. فقط سفارش را به مشتری تحویل دهید.</p>
      </>
    );
  }
  const due = order.due ?? 0;
  const amount = parseToman(cash);
  const mismatch =
    amount !== undefined && amount !== due
      ? `با مبلغ سفارش (${formatMoney(due)}) فرق دارد. تحویل ممکن است و مغایرت برای دکون گزارش می‌شود.`
      : undefined;
  return (
    <>
      <CustomerCard order={order} />
      <CashPanel
        due={formatMoney(due)}
        value={amount === undefined ? '' : groupFa(amount)}
        error={mismatch}
        onInput={setCash}
        onExact={() => setCash(String(due))}
      />
    </>
  );
}

function Summary({ done }: { done: TripDone }) {
  const rows = [
    { label: 'سفارش', value: `#${toFaDigits(done.no ?? '')} · ${done.rest ?? ''}` },
    ...(typeof done.km === 'number' ? [{ label: 'مسیر', value: km(done.km) }] : []),
    { label: 'پرداخت', value: done.cash ? 'نقدی' : 'آنلاین' },
    ...(done.cash ? [{ label: 'نقد دریافتی', value: formatMoney(done.cashCollected ?? 0) }] : []),
    ...(done.cash && done.cashMismatch ? [{ label: 'مغایرت', value: 'گزارش شد' }] : []),
  ];
  return (
    <TripSummary
      earn={formatMoney(done.earn)}
      rows={rows}
      onDone={() => {
        useActiveOrder.getState().clearDone();
        useCourierNav.getState().resetTo('orders');
      }}
    />
  );
}

const askUnreachable = () =>
  useCourierNav.getState().openOverlay({
    kind: 'dlg',
    props: {
      title: 'مشتری در دسترس نیست؟',
      text: 'برای مدیر شهر گزارش می‌شود و سفارش باز می‌ماند تا او راهنمایی کند.',
      confirmLabel: 'گزارش به مدیر شهر',
      onConfirm: () => {
        useCourierNav.getState().closeOverlay();
        void reportUnreachable();
      },
    },
  });

/**
 * The active order, step by step (KAN-96, courier screen specs «سفارش (مراحل)»): to the restaurant (map with
 * Neshan/Balad, call, copy address) → pickup (tick every dish, report a problem) → the customer leg
 * (KAN-97). Withdraw is offered only before pickup. Back returns to the orders tab, where the banner leads
 * here again.
 */
export function OrderScreen() {
  const order = useActiveOrder((st) => st.order);
  const trip = useActiveOrder((st) => st.trip);
  const checked = useActiveOrder((st) => st.checked);
  const done = useActiveOrder((st) => st.done);
  const [cash, setCash] = useState('');
  const tracking = useOnline((st) => st.tracking !== 'off');
  const [busy, setBusy] = useState(false);
  const back = () => useCourierNav.getState().back();

  if (!order && done) {
    return (
      <div className={s.wrap}>
        <TopBar title={`سفارش #${toFaDigits(done.no ?? '')}`} level={1} />
        <div className={s.body}>
          <Summary done={done} />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className={s.wrap}>
        <TopBar title="سفارش" onBack={back} level={1} />
        <div className={s.body}>
          <EmptyState art="dk-fries" title="سفارش فعالی ندارید" text="سفارش تحویل شده یا لغو شده است." />
        </div>
      </div>
    );
  }

  const stage = order.stage ?? 'toRest';
  const items = order.items ?? [];
  const allTicked = items.every((it) => checked.includes(it.id ?? ''));
  const dock = DOCK[stage];
  const canWithdraw = stage === 'toRest' || stage === 'pickup';

  const cashMissing = stage === 'handover' && order.cash === true && parseToman(cash) === undefined;
  const dockLabel = stage === 'handover' ? 'سفارش تحویل شد' : dock?.label;

  async function next() {
    if (busy) return;
    setBusy(true);
    if (stage === 'handover') await deliver(order?.cash ? parseToman(cash) : undefined);
    else if (dock) await advance(dock.next);
    setBusy(false);
  }

  return (
    <div className={s.wrap}>
      <TopBar title={`سفارش #${toFaDigits(order.no ?? '')}`} onBack={back} level={1} />
      <div className={s.body}>
        <StageBar stages={stagesOf(stage)} />
        {stage === 'toRest' ? <RestaurantLeg order={order} trip={trip} tracking={tracking} /> : null}
        {stage === 'pickup' ? <Pickup order={order} /> : null}
        {stage === 'toCust' ? <CustomerLeg order={order} trip={trip} tracking={tracking} /> : null}
        {stage === 'handover' ? <Handover order={order} cash={cash} setCash={setCash} /> : null}
        <div className={s.links}>
          {stage === 'pickup' ? (
            <button type="button" className={s.link} onClick={askIssue}>
              مشکل در سفارش دارم
            </button>
          ) : null}
          {canWithdraw ? (
            <button type="button" className={[s.link, s.danger].join(' ')} onClick={askWithdraw}>
              انصراف از سفارش
            </button>
          ) : null}
          {stage === 'toCust' || stage === 'handover' ? (
            <button type="button" className={s.link} onClick={askUnreachable}>
              مشتری در دسترس نیست
            </button>
          ) : null}
        </div>
      </div>
      {dockLabel ? (
        <div className={s.dock}>
          <ActionBar
            label={busy ? 'در حال ثبت…' : dockLabel}
            disabled={busy || (stage === 'pickup' && !allTicked) || cashMissing}
            onTap={() => void next()}
          />
        </div>
      ) : null}
    </div>
  );
}
