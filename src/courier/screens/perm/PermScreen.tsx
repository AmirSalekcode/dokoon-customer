import { useCallback, useEffect, useState } from 'react';
import { ActionBar } from '@/components/library/ActionBar';
import { LoadingState } from '@/components/library/LoadingState';
import { TopBar } from '@/components/library/TopBar';
import { isNative } from '@/lib/platform';
import { toast } from '@/ui/toast';
import { PermissionCard } from '../../components/PermissionCard';
import { useCourierNav } from '../../nav/nav';
import {
  canWork,
  checkAll,
  isIos,
  permissionProvider,
  type PermKind,
  type PermStates,
} from '../../permissions/provider';
import type { CourierScreenProps } from '../types';
import s from './perm.module.css';

/** Icons and texts from the prototype (`D.perms`). */
const INFO: Record<PermKind, { title: string; bgTitle?: string; text: string; d: string; cta?: string }> = {
  location: {
    title: 'موقعیت مکانی',
    bgTitle: 'موقعیت مکانی (همیشه)',
    text: 'برای پیشنهاد نزدیک‌ترین سفارش و نمایش مسیر به مشتری.',
    d: 'M12 21s-6-5.5-6-10a6 6 0 1 1 12 0c0 4.5-6 10-6 10zM12 8a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  },
  notifications: {
    title: 'اعلان‌ها',
    text: 'برای هشدار سفارش جدید با صدا.',
    d: 'M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4',
  },
  battery: {
    title: 'عدم محدودیت باتری',
    text: 'تا گوشی برنامه را وسط سفارش نبندد.',
    d: 'M5 8h12v8H5zM17 11h3v2h-3',
    cta: 'باز کردن تنظیمات',
  },
};
const DENIED_TEXT = 'اجازه بسته شده است. از تنظیمات مرورگر (قفل کنار آدرس) یا تنظیمات گوشی آن را باز کنید.';
const UNSUPPORTED_LOCATION = 'این مرورگر موقعیت مکانی ندارد؛ با مرورگر دیگری یا اپ اندروید وارد شوید.';

/**
 * Device permissions (KAN-92, courier screen specs «مجوزهای دستگاه»). After approval (`first`) it stands in
 * front of the orders tab and «ادامه» needs location and notifications; from the account tab it is a
 * normal page with back. The states are re-read when the courier returns from the system settings.
 */
export function PermScreen({ route }: CourierScreenProps) {
  const first = route.params.first === '1';
  const provider = permissionProvider();
  const [states, setStates] = useState<PermStates | null>(null);
  const [asking, setAsking] = useState<PermKind | null>(null);

  const refresh = useCallback(() => {
    void checkAll().then(setStates);
  }, []);

  useEffect(() => {
    refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  const grant = async (kind: PermKind) => {
    setAsking(kind);
    try {
      const st = await provider.request(kind).catch(() => 'denied' as const);
      setStates((prev) => (prev ? { ...prev, [kind]: st } : prev));
      if (st === 'denied') toast(DENIED_TEXT, 'warn', 4000);
    } finally {
      setAsking(null);
    }
  };

  const ios = isIos() && !isNative();
  const kinds = provider.kinds.filter((k) => !(k === 'notifications' && states?.notifications === 'unsupported'));
  const ready = states ? canWork(states) : false;

  return (
    <div className={s.wrap}>
      <TopBar title="مجوزهای دستگاه" onBack={first ? undefined : () => useCourierNav.getState().back()} />
      <div className={s.body}>
        <p className={s.note}>
          برای دریافت و تحویل سفارش، این مجوزها لازم است. موقعیت شما فقط وقتی آنلاین هستید یا سفارش دارید ثبت
          می‌شود.
        </p>
        {ios ? (
          <p className={s.warn} role="note">
            در آیفون موقعیت فقط وقتی برنامه باز است ارسال می‌شود (موقعیت پس‌زمینه ندارد). برای کار روزانه اپ
            اندروید دکون پیک پیشنهاد می‌شود.
          </p>
        ) : null}
        {states?.notifications === 'unsupported' ? (
          <p className={s.warn} role="note">
            {ios
              ? 'برای دریافت اعلان، دکون پیک را با «افزودن به صفحه‌ی اصلی» نصب کنید (iOS ۱۶٫۴ به بعد). تا آن موقع فقط وقتی برنامه باز است با صدا خبر می‌دهیم.'
              : 'این مرورگر اعلان ندارد؛ فقط وقتی برنامه باز است با صدا خبر می‌دهیم.'}
          </p>
        ) : null}
        {states ? (
          kinds.map((k) => {
            const info = INFO[k];
            const st = states[k];
            const text =
              k === 'location' && st === 'unsupported'
                ? UNSUPPORTED_LOCATION
                : st === 'denied'
                  ? `${info.text} ${DENIED_TEXT}`
                  : info.text;
            return (
              <PermissionCard
                key={k}
                perm={{
                  title: provider.backgroundLocation && info.bgTitle ? info.bgTitle : info.title,
                  text,
                  d: info.d,
                  granted: st === 'granted',
                  cta: asking === k ? 'در حال درخواست…' : info.cta,
                }}
                onGrant={() => {
                  if (!asking && st !== 'unsupported') void grant(k);
                }}
              />
            );
          })
        ) : (
          <LoadingState variant="list" rows={2} />
        )}
      </div>
      {first ? (
        <div className={s.dock}>
          <ActionBar
            label="ادامه"
            disabled={!ready}
            onTap={() => {
              if (ready) useCourierNav.getState().resetTo('orders');
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
