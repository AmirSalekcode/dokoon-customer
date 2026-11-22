import { useId } from 'react';
import { useDialogFocus } from '@/components/base/useDialogFocus';
import { Icon } from '@/components/primitives/Icon';
import type { OfferView } from './OfferCard';
import s from './OfferAlert.module.css';

export interface OfferAlertView extends Omit<OfferView, 'time'> {
  /** «۰٫۸ کیلومتر تا شما» */
  d1: string;
  /** «۲٫۴ کیلومتر مسیر» */
  d2: string;
}

export interface OfferAlertProps {
  offer: OfferAlertView;
  /** Seconds left, already in Persian digits («۲۴»). */
  timerText: string;
  /** Time left 0..1 (ring). */
  progress: number;
  /** The accept request is running (acceptance is atomic on the server). */
  busy?: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export const D_BIKE =
  'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z';
/** 2πr of the 54px ring. */
const RING = 2 * Math.PI * 54;

/**
 * Full-screen new-offer alert: pulsing icon, 30-second ring timer, earnings, pickup and drop-off
 * neighbourhoods, a 64px white «قبول سفارش» and «رد کردن». It must be answered (or time out): Escape
 * does not dismiss it. Motion is off under prefers-reduced-motion.
 */
export function OfferAlert({ offer: o, timerText, progress, busy, onAccept, onReject }: OfferAlertProps) {
  const ref = useDialogFocus<HTMLElement>();
  const titleId = useId();
  const restId = useId();
  const p = Math.max(0, Math.min(1, progress));
  return (
    <section
      ref={ref}
      className={s.alert}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={restId}
      tabIndex={-1}
    >
      <div className={s.head}>
        <div className={s.icon}>
          <span className={s.ring} aria-hidden="true" />
          <span className={s.ring} aria-hidden="true" />
          <Icon d={D_BIKE} size={36} />
        </div>
        <h1 id={titleId}>سفارش جدید برای شما</h1>
        <p id={restId}>{o.rest}</p>
      </div>
      <div className={s.timer} role="timer" aria-label={`${timerText} ثانیه برای پاسخ`}>
        <svg viewBox="0 0 128 128" aria-hidden="true">
          <circle className={s.track} cx="64" cy="64" r="54" />
          <circle
            className={s.progress}
            cx="64"
            cy="64"
            r="54"
            strokeDasharray={RING}
            strokeDashoffset={RING * (1 - p)}
          />
        </svg>
        <span className={s.time} aria-hidden="true">
          <b>{timerText}</b>
          <small>ثانیه</small>
        </span>
      </div>
      <div className={s.card}>
        <p className={s.earn}>
          <small>درآمد این سفارش</small>
          <b>{o.earn}</b>
        </p>
        <div className={s.route}>
          <span className={s.dots} aria-hidden="true">
            <i />
            <u />
            <i />
          </span>
          <div className={s.places}>
            <p>
              {o.from}
              <small>تحویل از رستوران · {o.d1}</small>
            </p>
            <p>
              {o.to}
              <small>تحویل به مشتری · {o.d2}</small>
            </p>
          </div>
        </div>
        <p className={s.meta}>
          <span>{o.dist}</span>
          <span className={o.cash ? s.cash : undefined}>{o.pay}</span>
        </p>
      </div>
      <div className={s.actions}>
        <button
          type="button"
          className={s.accept}
          disabled={busy}
          aria-busy={busy || undefined}
          onClick={onAccept}
        >
          قبول سفارش
        </button>
        <button type="button" className={s.reject} disabled={busy} onClick={onReject}>
          رد کردن
        </button>
      </div>
    </section>
  );
}
