import { useEffect } from 'react';
import { EmptyState } from '@/components/library/EmptyState';
import { LoadingState } from '@/components/library/LoadingState';
import { Icon } from '@/components/primitives/Icon';
import { OfferCard, OnlineSwitch } from '../../components';
import type { TrackState } from '../../location/tracker';
import { useCourierNav } from '../../nav/nav';
import { offerView } from '../../offers/present';
import { useCourierLive } from '../../realtime/live';
import { STAGE_LABEL, useActiveOrder } from '../../state/active';
import { openOffer } from '../../state/alert';
import { useOffers } from '../../state/offers';
import { useOnline } from '../../state/online';
import s from './orders.module.css';

/** Tracking line under the offers (security checklist: the tracking state is always visible). */
const TRACK: Record<TrackState, { label: string; text: string }> = {
  off: { label: 'ردیابی خاموش', text: 'در حالت آفلاین موقعیت شما ثبت نمی‌شود.' },
  waiting: {
    label: 'ردیابی فعال',
    text: 'در حال یافتن موقعیت شما… موقعیت فقط تا وقتی آنلاین هستید یا سفارش دارید ثبت می‌شود.',
  },
  active: { label: 'ردیابی فعال', text: 'موقعیت شما فقط تا وقتی آنلاین هستید یا سفارش دارید ثبت می‌شود.' },
  denied: { label: 'موقعیت در دسترس نیست', text: 'اجازه‌ی موقعیت مکانی بسته شده است؛ بدون آن سفارش پیشنهاد نمی‌شود.' },
  unavailable: { label: 'موقعیت در دسترس نیست', text: 'موقعیت دستگاه پیدا نشد؛ مکان‌یاب (GPS) را روشن کنید.' },
};

const BIKE = 'M5 17a3 3 0 1 0 0-.01M19 17a3 3 0 1 0 0-.01M5 17l4-8h5l3 8M9 9l-1-3H6M14 9h3';

/**
 * Orders tab (KAN-93/94, courier screen specs «سفارش‌ها»): the online switch, the «سفارش در جریان» banner,
 * the nearby offers (live, neighbourhoods only), empty / offline states and the tracking line. The shell
 * draws the orange header above it.
 */
export function OrdersScreen() {
  const { online, busy, hasActive, tracking, flip } = useOnline();
  const active = useActiveOrder((st) => st.order);
  const offers = useOffers((st) => st.list);
  const offersStatus = useOffers((st) => st.status);
  const degraded = useCourierLive((st) => st.degraded);
  const track = TRACK[tracking];
  const problem = tracking === 'denied' || tracking === 'unavailable';

  // The order in progress survives a restart: ask the server each time the tab opens.
  useEffect(() => {
    void useActiveOrder.getState().load();
  }, []);

  const note = online
    ? 'موقعیت شما ثبت می‌شود و سفارش‌های نزدیک نمایش داده می‌شود'
    : 'برای دریافت سفارش، آنلاین شوید';
  const free = online && !hasActive;

  return (
    <div className={s.page}>
      <div className={s.body}>
        <OnlineSwitch online={online} busy={busy} note={note} onFlip={() => void flip()} />

        {active ? (
          <button
            type="button"
            className={s.banner}
            onClick={() => useCourierNav.getState().push('order', { id: active.id ?? '' })}
          >
            <span className={s.bannerIcon}>
              <Icon d={BIKE} />
            </span>
            <span className={s.bannerText}>
              <small>سفارش در جریان</small>
              <b>
                {active.rest} · {STAGE_LABEL[active.stage ?? 'toRest']}
              </b>
            </span>
            <span className={s.bannerGo}>ادامه</span>
          </button>
        ) : null}

        {free && degraded ? (
          <p className={s.degraded} role="alert">
            اتصال زنده قطع شده است؛ فهرست هر چند ثانیه به‌روز می‌شود و دوباره وصل می‌شویم.
          </p>
        ) : null}

        {free && offersStatus === 'loading' ? <LoadingState variant="list" rows={2} /> : null}

        {free && offers.length > 0 ? (
          <section aria-labelledby="offers-title" className={s.offers}>
            <h2 id="offers-title" className={s.title}>
              سفارش‌های نزدیک شما
            </h2>
            <div className={s.grid}>
              {offers.map((o) => (
                <OfferCard key={o.id} offer={offerView(o)} onOpen={() => openOffer(o.id ?? '')} />
              ))}
            </div>
          </section>
        ) : null}

        {free && offersStatus === 'error' && offers.length === 0 ? (
          <EmptyState
            art="dk-fries"
            title="پیشنهادها دریافت نشد"
            text="ارتباط با سرور برقرار نشد. پیشنهادهای تازه با اتصال زنده هم می‌رسند."
            action={
              <button type="button" className={s.fix} onClick={() => void useOffers.getState().load()}>
                تلاش دوباره
              </button>
            }
          />
        ) : null}

        {free && offers.length === 0 && offersStatus === 'ready' ? (
          <EmptyState
            art="dk-fries"
            title="منتظر سفارش باشید"
            text="تا سفارشی نزدیک شما ثبت شود، همین‌جا بمانید. با صدا خبر می‌دهیم."
          />
        ) : null}

        {!online && !hasActive ? (
          <EmptyState
            art="dk-fries"
            title="آفلاین هستید"
            text="برای دیدن و گرفتن سفارش‌ها، کلید بالا را روشن کنید."
          />
        ) : null}

        <div
          className={[s.track, tracking !== 'off' && s.on, problem && s.bad].filter(Boolean).join(' ')}
          data-testid="tracking"
          role="status"
          aria-live="polite"
        >
          <span className={s.dot} aria-hidden="true" />
          <p>
            <b>{track.label}</b>
            <span>{track.text}</span>
          </p>
          {problem ? (
            <button type="button" className={s.fix} onClick={() => useCourierNav.getState().push('perm')}>
              مجوزها
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
