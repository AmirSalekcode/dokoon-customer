import { useEffect } from 'react';
import { api } from '@/api/client';
import { bootScreen } from '@/auth/flow';
import { useSession } from '@/auth/session';
import { Logo } from '@/components/primitives/Logo';
import { toFaDigits } from '@/lib/format';
import { useNav } from '@/nav/nav';
import type { ScreenProps } from '../registry';
import s from './auth.module.css';

/**
 * Decision D-61: the splash stays at least SPLASH_MIN_MS (brand moment) and leaves as soon as the
 * app is ready (session revalidated), but never later than SPLASH_MAX_MS (the original 1.8s).
 * A fixed 1.8s delayed the main content (LCP ~2.3s on every launch).
 */
export const SPLASH_MIN_MS = 600;
export const SPLASH_MAX_MS = 1800;

/** Revalidate a stored session in the background; an invalid one just drops the user to guest. */
async function checkSession() {
  const { accessToken, setUser, clear } = useSession.getState();
  if (!accessToken) return;
  try {
    const { data } = await api.GET('/me');
    if (data) setUser(data);
  } catch {
    clear();
  }
}

export function SplashScreen(_: ScreenProps) {
  useEffect(() => {
    let left = false;
    let minDone = false;
    let ready = false;
    const leave = () => {
      if (left) return;
      left = true;
      useNav.getState().setTop(bootScreen());
    };
    const maybeLeave = () => minDone && ready && leave();
    const min = setTimeout(() => {
      minDone = true;
      maybeLeave();
    }, SPLASH_MIN_MS);
    const max = setTimeout(leave, SPLASH_MAX_MS);
    void checkSession().finally(() => {
      ready = true;
      maybeLeave();
    });
    return () => {
      left = true;
      clearTimeout(min);
      clearTimeout(max);
    };
  }, []);

  return (
    <div className={s.au}>
      <div className={s.splashMid}>
        <Logo height={56} className={s.logoBig} />
        <p>غذای محبوبت، دم در خونه‌ات</p>
        <div className={s.dots} aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      </div>
      <small className={s.version}>نسخه {toFaDigits(__APP_VERSION__).replace(/\./g, '٫')}</small>
    </div>
  );
}
