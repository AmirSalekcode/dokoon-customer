import { useDialogFocus } from '@/components/base/useDialogFocus';
import { Icon } from '@/components/primitives/Icon';
import s from './NewOrderAlert.module.css';

export interface NewOrderAlertView {
  /** «#۱۲۴۹» */
  no: string;
  items: { q: string; name: string; opt?: string }[];
  note?: string;
  pay: 'online' | 'cash';
  payLabel: string;
  total: string;
}

export interface NewOrderAlertProps {
  order: NewOrderAlertView;
  /** «۲:۴۵» */
  timerText: string;
  /** Time left 0..1 (ring). */
  progress: number;
  muted: boolean;
  /** «۱ سفارش دیگر در صف» ('' = none). */
  queueText?: string;
  onAccept: () => void;
  onReject: () => void;
  onMute: () => void;
}

const D_BELL = 'M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4';
const D_SOUND = 'M5 10v4h3l5 4V6l-5 4zM17 9a4 4 0 0 1 0 6';
const D_MUTED = 'M5 10v4h3l5 4V6l-5 4zM17 9l4 6M21 9l-4 6';
/** 2πr of the 56px ring. */
const RING = 2 * Math.PI * 56;

/**
 * Full-screen new-order alert (restaurant component library): ringing bell, 3-minute ring timer, the
 * order, accept / reject. It must be answered: Escape does not dismiss it.
 */
export function NewOrderAlert({
  order: o,
  timerText,
  progress,
  muted,
  queueText,
  onAccept,
  onReject,
  onMute,
}: NewOrderAlertProps) {
  const ref = useDialogFocus<HTMLElement>();
  const p = Math.max(0, Math.min(1, progress));
  return (
    <section
      ref={ref}
      className={s.alert}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="noa-title"
      aria-describedby="noa-no"
      tabIndex={-1}
      dir="rtl"
    >
      <button type="button" className={s.mute} onClick={onMute} aria-pressed={muted}>
        <Icon d={muted ? D_MUTED : D_SOUND} size={18} />
        {muted ? 'صدا قطع است' : 'قطع صدا'}
      </button>
      <div className={s.head}>
        <div className={s.bell}>
          <span className={s.ring} aria-hidden="true" />
          <span className={s.ring} aria-hidden="true" />
          <Icon d={D_BELL} size={36} />
        </div>
        <h1 id="noa-title">سفارش جدید!</h1>
        <p id="noa-no">{o.no}</p>
        {queueText ? <p className={s.queue}>{queueText}</p> : null}
      </div>
      <div className={s.timer} role="timer" aria-label={`زمان باقی‌مانده برای پاسخ ${timerText}`}>
        <svg viewBox="0 0 128 128" aria-hidden="true">
          <circle className={s.track} cx="64" cy="64" r="56" />
          <circle
            className={s.progress}
            cx="64"
            cy="64"
            r="56"
            strokeDasharray={RING}
            strokeDashoffset={RING * (1 - p)}
          />
        </svg>
        <span className={s.time} aria-hidden="true">
          {timerText}
          <small>تا لغو خودکار</small>
        </span>
      </div>
      <div className={s.card}>
        <ul className={s.items}>
          {o.items.map((it, i) => (
            <li key={i}>
              <span className={s.q}>{it.q}</span>
              <span>
                {it.name}
                {it.opt ? <small>{it.opt}</small> : null}
              </span>
            </li>
          ))}
        </ul>
        {o.note ? (
          <div className={s.note}>
            <b>توضیح مشتری</b>
            {o.note}
          </div>
        ) : null}
        <div className={s.foot}>
          <span className={[s.pay, o.pay === 'cash' && s.cash].filter(Boolean).join(' ')}>{o.payLabel}</span>
          <span className={s.total}>{o.total}</span>
        </div>
      </div>
      <div className={s.actions}>
        <button type="button" className={s.accept} onClick={onAccept}>
          پذیرش سفارش
        </button>
        <button type="button" className={s.reject} onClick={onReject}>
          رد سفارش
        </button>
      </div>
    </section>
  );
}
