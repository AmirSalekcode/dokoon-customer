import { useEffect, useState } from 'react';
import { ApiError } from '@/api/errors';
import { formatDecimal, formatNumber, toFaDigits } from '@/lib/format';
import { toast } from '@/ui/toast';
import { courierApi, offerAction } from '../api/client';
import { businessError, COURIER_ERROR, hasActiveOrder } from '../api/errors';
import type { ActiveOrder, Offer } from '../api/types';
import { OfferAlert, type OfferAlertView } from '../components';
import { showFullPageError } from '../errors/fullPage';
import { useCourierNav } from '../nav/nav';
import { offerView } from '../offers/present';
import type { OfferGoneReason } from '../realtime/events';
import { onCourierEvent } from '../realtime/live';
import { useActiveOrder } from '../state/active';
import { useOffers } from '../state/offers';
import { COURIER_TOAST_MS } from '../state/online';
import { offerSound } from './sound';

/** The answer window the ring shows (the server owns the real deadline, `expiresAt`). */
export const OFFER_WINDOW_MS = 30_000;

export const ALERT_MSG = {
  accepted: 'سفارش مال شماست؛ به سمت رستوران بروید',
  taken: 'پیک دیگری زودتر این سفارش را برداشت',
  expired: 'زمان این پیشنهاد تمام شد',
  cancelled: 'این سفارش لغو شد',
  failed: 'پاسخ ثبت نشد؛ دوباره تلاش کنید',
  busy: 'اول سفارش در جریان را تمام کنید',
} as const;

const GONE: Record<OfferGoneReason, string> = {
  taken: ALERT_MSG.taken,
  expired: ALERT_MSG.expired,
  cancelled: ALERT_MSG.cancelled,
};

export function alertView(o: Offer): OfferAlertView {
  const v = offerView(o);
  return {
    rest: v.rest,
    earn: v.earn,
    from: v.from,
    to: v.to,
    d1: `${formatDecimal(o.kmToRest ?? 0)} کیلومتر تا شما`,
    d2: `${formatDecimal(o.km ?? 0)} کیلومتر مسیر`,
    dist: `حدود ${formatNumber(o.minutes ?? 0)} دقیقه`,
    pay: v.pay,
    cash: v.cash,
  };
}

const leftMs = (o: Offer | undefined, now: number) =>
  o?.expiresAt ? Math.max(0, Date.parse(o.expiresAt) - now) : 0;

/** Close the alert (only if it is still the one on top) and drop the offer from the list. */
function finish(offerId: string, message?: string, tone: 'info' | 'warn' = 'warn') {
  const nav = useCourierNav.getState();
  if (nav.overlay?.kind === 'alr' && nav.overlay.props?.offerId === offerId) nav.closeOverlay();
  useOffers.getState().apply({ event: 'offer.gone', data: { offerId, reason: 'taken' } });
  if (message) toast(message, tone, COURIER_TOAST_MS);
}

/**
 * The new-offer alert (KAN-95, courier screen specs «هشدار سفارش»): opened by a card tap or a live
 * `offer.created`. The ring counts down to the server's `expiresAt`; the client never closes an offer on its
 * own, it only stops showing it. Accept is atomic on the server: `409` (another courier, or time up) closes
 * the alert with the reason. Back hides the alert; the offer stays in the list until its time is up.
 */
export function OfferAlertOverlay({ props }: { props: Record<string, unknown> }) {
  const offerId = String(props.offerId ?? '');
  const offer = useOffers((st) => st.list.find((o) => o.id === offerId));
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  // Keep showing the offer while the accept request runs, even if the list drops it meanwhile.
  const [shown, setShown] = useState(offer);
  if (offer && offer !== shown) setShown(offer);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    offerSound().start();
    return () => offerSound().stop();
  }, []);

  // Another courier won it, or it was cancelled, while the alert is open.
  useEffect(
    () =>
      onCourierEvent((msg) => {
        if (msg.event === 'offer.gone' && msg.data.offerId === offerId && !busy)
          finish(offerId, GONE[msg.data.reason] ?? ALERT_MSG.expired);
      }),
    [offerId, busy],
  );

  const left = leftMs(shown, now);
  useEffect(() => {
    if (!busy && (!shown || left <= 0)) finish(offerId, shown ? ALERT_MSG.expired : undefined);
  }, [busy, shown, left, offerId]);

  if (!shown) return null;

  async function accept() {
    setBusy(true);
    offerSound().stop();
    try {
      const { data, error } = await offerAction(courierApi(), offerId, 'accept');
      if (data) {
        useCourierNav.getState().closeOverlay();
        useActiveOrder.getState().set(data as ActiveOrder);
        useCourierNav.getState().push('order', { id: (data as ActiveOrder).id ?? '' });
        toast(ALERT_MSG.accepted, 'info', COURIER_TOAST_MS);
        return;
      }
      const code = businessError(error)?.code;
      if (code === COURIER_ERROR.offerTaken) finish(offerId, ALERT_MSG.taken);
      else if (code === COURIER_ERROR.offerExpired) finish(offerId, ALERT_MSG.expired);
      else if (hasActiveOrder(error)) {
        finish(offerId, ALERT_MSG.busy);
        void useActiveOrder.getState().load();
      } else {
        setBusy(false);
        offerSound().start();
        toast(ALERT_MSG.failed, 'error', COURIER_TOAST_MS);
      }
    } catch (e) {
      setBusy(false);
      if (e instanceof ApiError && e.isFullPage) {
        useCourierNav.getState().closeOverlay();
        showFullPageError(e, () => {});
      } else toast(ALERT_MSG.failed, 'error', COURIER_TOAST_MS);
    }
  }

  function reject() {
    // The answer goes out in the background; the offer leaves this courier's list either way.
    void offerAction(courierApi(), offerId, 'reject').catch(() => {});
    finish(offerId);
  }

  return (
    <OfferAlert
      offer={alertView(shown)}
      timerText={toFaDigits(Math.ceil(left / 1000))}
      progress={left / OFFER_WINDOW_MS}
      busy={busy}
      onAccept={() => void accept()}
      onReject={reject}
    />
  );
}
