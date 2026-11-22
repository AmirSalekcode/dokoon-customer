import { useEffect, useState } from 'react';
import { Button } from '@/components/base/Button';
import { EmptyState } from '@/components/library/EmptyState';
import { toast } from '@/ui/toast';
import { courierApi } from '../../api/client';
import { useCourierSession } from '../../api/session';
import { applyMe, enter, signOutToLogin } from '../../auth/flow';
import { showFullPageError } from '../../errors/fullPage';
import type { CourierScreenProps } from '../types';
import s from './auth.module.css';

const TEXT = {
  pending: {
    title: 'حساب شما در انتظار تأیید است',
    text: 'مدیر شهر در حال بررسی مدارک شماست. بعد از تأیید، پیامک می‌گیرید و می‌توانید آنلاین شوید.',
  },
  suspended: {
    title: 'حساب شما موقتاً غیرفعال است',
    text: 'تا بررسی مدیر شهر نمی‌توانید سفارش بگیرید. برای پیگیری با مدیر شهر تماس بگیرید.',
  },
} as const;

let inFlight = false;

/**
 * Ask `GET /c/me` again; approved (or no account) → that screen. `manual`: «بررسی دوباره» — tells the
 * courier when nothing changed and shows full-page errors; the silent check on return to the app does not.
 */
async function recheck(manual: boolean): Promise<void> {
  if (inFlight) return;
  inFlight = true;
  try {
    const { data } = await courierApi().GET('/c/me');
    if (!data) return;
    const before = useCourierSession.getState().status;
    const next = applyMe(data);
    if (next !== 'pending' && next !== 'suspended') await enter(next);
    else if (manual && next === before) toast('هنوز در حال بررسی است', 'info');
  } catch (e) {
    if (manual) showFullPageError(e, () => void recheck(true));
  } finally {
    inFlight = false;
  }
}

/**
 * Waiting page (courier screen specs «انتظار تأیید», KAN-90): pending or suspended. «بررسی دوباره» and
 * coming back to the app ask `GET /c/me`; once approved the courier goes on without signing in again.
 */
export function WaitScreen({ route }: CourierScreenProps) {
  void route;
  const status = useCourierSession((st) => st.status);
  const t = status === 'suspended' ? TEXT.suspended : TEXT.pending;
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void recheck(false);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const onCheck = async () => {
    setBusy(true);
    await recheck(true);
    setBusy(false);
  };

  return (
    <div className={s.center}>
      <EmptyState art="dk-fries" title={t.title} text={t.text} />
      <Button size="lg" block loading={busy} onClick={() => void onCheck()}>
        بررسی دوباره
      </Button>
      <button type="button" className={s.link} onClick={signOutToLogin}>
        خروج از حساب
      </button>
    </div>
  );
}
