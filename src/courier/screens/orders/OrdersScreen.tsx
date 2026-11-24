import { EmptyState } from '@/components/library/EmptyState';
import { OnlineSwitch } from '../../components';
import type { TrackState } from '../../location/tracker';
import { useCourierNav } from '../../nav/nav';
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

/**
 * Orders tab (KAN-93, courier screen specs «سفارش‌ها»): the online switch and the tracking line (the shell
 * draws the orange header above it).
 * The nearby offers and the active-order banner join this page in KAN-94.
 */
export function OrdersScreen() {
  const { online, busy, hasActive, tracking, flip } = useOnline();
  const track = TRACK[tracking];
  const problem = tracking === 'denied' || tracking === 'unavailable';

  const note = online
    ? 'موقعیت شما ثبت می‌شود و سفارش‌های نزدیک نمایش داده می‌شود'
    : 'برای دریافت سفارش، آنلاین شوید';

  return (
    <div className={s.page}>
      <div className={s.body}>
        <OnlineSwitch online={online} busy={busy} note={note} onFlip={() => void flip()} />
        {online ? (
          <EmptyState
            art="dk-fries"
            title="منتظر سفارش باشید"
            text="تا سفارشی نزدیک شما ثبت شود، همین‌جا بمانید. با صدا خبر می‌دهیم."
          />
        ) : hasActive ? null : (
          <EmptyState
            art="dk-fries"
            title="آفلاین هستید"
            text="برای دیدن و گرفتن سفارش‌ها، کلید بالا را روشن کنید."
          />
        )}
        <div
          className={[s.track, tracking !== 'off' && s.on, problem && s.bad].filter(Boolean).join(' ')}
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
