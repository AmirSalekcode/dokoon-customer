import { Icon } from '@/components/primitives/Icon';
import type { OrderTone } from '../orders/present';
import s from './OrderDetail.module.css';

export interface OrderDetailView {
  /** «#۱۲۴۸» */
  no: string;
  statusLabel: string;
  tone: OrderTone;
  /** «۵ دقیقه پیش» */
  placed: string;
  /** Prep time / deadline / reason line; '' = none. */
  etaText?: string;
  canAddTime?: boolean;
  items: { q: string; name: string; opt?: string; price: string }[];
  note?: string;
  rows: { label: string; value: string }[];
  total: string;
  pay: 'online' | 'cash';
  payText: string;
  customer: string;
  area?: string;
  /** Server-masked phone (no call button: no direct contact with customers). */
  phoneMasked?: string;
  courier?: { name: string; sub?: string } | null;
  /** Main action of the step; null = none. */
  primary?: { label: string; tone: 'new' | 'ok' | 'dark' } | null;
  /** «رد سفارش» / «لغو سفارش»; '' = none. */
  secondaryLabel?: string;
}

export interface OrderDetailProps {
  order: OrderDetailView;
  /** Action in flight (main/extra buttons disabled). */
  busy?: boolean;
  onPrimary?: () => void;
  onSecondary?: () => void;
  onAddTime?: () => void;
  onPrint?: () => void;
  /** Paper chooser next to «چاپ رسید» (D-97). */
  paper?: { value: '80mm' | 'a4'; onPick: (p: '80mm' | 'a4') => void };
}

const D_USER = 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21a8 8 0 0 1 16 0';
const D_BIKE =
  'M5 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM5 15h4l3-6h4l3 6M12 9l-2-3H7';
const D_PRINT =
  'M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M7 14h10v6H7z';

/**
 * Full order (restaurant component library): status, prep time (+5 while preparing), items, note,
 * totals, payment, masked customer, courier, main / secondary action, receipt. Same component for the
 * phone screen and the tablet side panel. No call buttons: customers are never called from the panel
 * and the courier call waits for the proxy-number endpoint (D-100).
 */
export function OrderDetail({
  order: o,
  busy,
  onPrimary,
  onSecondary,
  onAddTime,
  onPrint,
  paper,
}: OrderDetailProps) {
  return (
    <div className={s.wrap} dir="rtl" data-testid="order-detail">
      <section className={s.card} aria-label="وضعیت سفارش">
        <div className={s.head}>
          <b className={s.no}>{o.no}</b>
          <span className={[s.badge, s[`t_${o.tone}`]].join(' ')}>{o.statusLabel}</span>
          <span className={s.time}>{o.placed}</span>
        </div>
        {o.etaText ? (
          <div className={s.eta}>
            <Icon name="clock" size={20} />
            <span>{o.etaText}</span>
            {o.canAddTime && onAddTime ? (
              <button
                type="button"
                onClick={onAddTime}
                disabled={busy}
                aria-label="افزودن ۵ دقیقه به زمان آماده‌سازی"
              >
                +۵ دقیقه
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className={s.card} aria-labelledby="od-items">
        <h3 id="od-items" className={s.t}>
          اقلام سفارش
        </h3>
        <ul className={s.items}>
          {o.items.map((x, i) => (
            <li key={i}>
              <span className={s.q}>{x.q}</span>
              <span className={s.name}>
                {x.name}
                {x.opt ? <small>{x.opt}</small> : null}
              </span>
              <em>{x.price}</em>
            </li>
          ))}
        </ul>
        {o.note ? (
          <div className={s.note}>
            <b>توضیح مشتری</b>
            {o.note}
          </div>
        ) : null}
        {o.rows.map((r) => (
          <div key={r.label} className={s.row}>
            <span>{r.label}</span>
            <b>{r.value}</b>
          </div>
        ))}
        <div className={s.total}>
          <span>مبلغ غذاها</span>
          <span>{o.total}</span>
        </div>
        <div className={[s.pay, o.pay === 'cash' && s.cash].filter(Boolean).join(' ')}>
          <Icon name={o.pay === 'cash' ? 'wallet' : 'card'} size={20} />
          <span>{o.payText}</span>
        </div>
      </section>

      <section className={s.card} aria-labelledby="od-who">
        <h3 id="od-who" className={s.t}>
          مشتری و تحویل
        </h3>
        <div className={s.person}>
          <span className={s.avatar}>
            <Icon d={D_USER} />
          </span>
          <div>
            <b>{o.customer}</b>
            {o.area ? <small>{o.area}</small> : null}
            {o.phoneMasked ? (
              <small dir="ltr" className={s.phone}>
                {o.phoneMasked}
              </small>
            ) : null}
          </div>
        </div>
        {o.courier ? (
          <div className={s.person}>
            <span className={s.avatar}>
              <Icon d={D_BIKE} />
            </span>
            <div>
              <b>{o.courier.name}</b>
              {o.courier.sub ? <small>{o.courier.sub}</small> : null}
            </div>
          </div>
        ) : null}
      </section>

      <div className={s.actions}>
        {o.primary ? (
          <button
            type="button"
            className={[s.primary, s[`a_${o.primary.tone}`]].join(' ')}
            onClick={onPrimary}
            disabled={busy}
            aria-busy={busy || undefined}
          >
            {busy ? <i className={s.spin} aria-hidden="true" /> : null}
            {o.primary.label}
          </button>
        ) : null}
        <div className={s.printRow}>
          <button type="button" className={s.secondary} onClick={onPrint}>
            <Icon d={D_PRINT} size={20} />
            چاپ رسید
          </button>
          {paper ? (
            <div className={s.paper} role="group" aria-label="اندازه‌ی کاغذ">
              {(['80mm', 'a4'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={paper.value === p}
                  className={paper.value === p ? s.on : undefined}
                  onClick={() => paper.onPick(p)}
                >
                  {p === '80mm' ? '۸۰ میلی‌متر' : 'آ۴'}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {o.secondaryLabel ? (
          <button
            type="button"
            className={[s.secondary, s.danger].join(' ')}
            onClick={onSecondary}
            disabled={busy}
          >
            {o.secondaryLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
