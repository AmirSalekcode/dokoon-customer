import { useEffect } from 'react';
import { api } from '@/api/client';
import { bootScreen } from '@/auth/flow';
import { useSession } from '@/auth/session';
import { Logo } from '@/components/primitives/Logo';
import { toFaDigits } from '@/lib/format';
import { useNav } from '@/nav/nav';
import type { ScreenProps } from '../registry';
import s from './auth.module.css';

/** Splash length from the spec (screen-specs §1). */
export const SPLASH_MS = 1800;

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
    void checkSession();
    const t = setTimeout(() => useNav.getState().setTop(bootScreen()), SPLASH_MS);
    return () => clearTimeout(t);
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
