import { useEffect } from 'react';
import { FilterChip } from '@/components/library/FilterChip';
import { ListRow } from '@/components/library/ListRow';
import { ToggleRow } from '@/components/library/ToggleRow';
import { Art } from '@/components/primitives/Art';
import { config } from '@/config/env';
import { toFaDigits } from '@/lib/format';
import { useTheme } from '@/theme/theme';
import { ERROR_KINDS } from '../../errors/panelErrors';
import { usePanelNav, type PanelScreen } from '../../nav/nav';
import { useRestaurant } from '../../state/restaurant';
import s from './account.module.css';

interface Row {
  title: string;
  sub: string;
  d: string;
  to: PanelScreen;
}

/** Sub-screens of the account tab (restaurant screen specs §5). */
export const ACCOUNT_ROWS: Row[] = [
  {
    title: 'ساعت کاری',
    sub: 'برنامه‌ی هفتگی باز و بسته بودن',
    d: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
    to: 'hours',
  },
  {
    title: 'تنظیمات تحویل و پرداخت',
    sub: 'پرداخت نقدی، افزودنی‌ها، زمان آماده‌سازی',
    d: 'M4 7h10M18 7h2M4 17h2M10 17h10M14 5v4M6 15v4',
    to: 'delivery',
  },
  {
    title: 'صدا و هشدار',
    sub: 'صدای سفارش جدید و لرزش',
    d: 'M5 10v4h3l5 4V6l-5 4zM17 9a4 4 0 0 1 0 6',
    to: 'sound',
  },
  {
    title: 'راهنما و پشتیبانی',
    sub: 'پرسش‌های پرتکرار و تماس',
    d: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9.5a2.5 2.5 0 0 1 5 .5c0 1.5-2.5 2-2.5 3.5M12 17h.01',
    to: 'help',
  },
];

/** Account tab (KAN-69): restaurant card, sub-screens, dark mode, sign out (confirm), app version. */
export function AccountScreen() {
  const theme = useTheme((st) => st.theme);
  const setMode = useTheme((st) => st.setMode);
  const profile = useRestaurant((st) => st.profile);
  const { push, showError, resetTo, openOverlay } = usePanelNav.getState();

  useEffect(() => {
    if (!useRestaurant.getState().profile && useRestaurant.getState().status !== 'loading')
      void useRestaurant.getState().load();
  }, []);

  return (
    <div className={s.page}>
      {profile ? (
        <div className={s.acc}>
          <span className={s.av}>
            <Art src="dk-kebab" />
          </span>
          <div>
            <h2>{profile.name}</h2>
            <p>
              {[profile.ownerName, profile.phoneMasked && `⁦${toFaDigits(profile.phoneMasked)}⁩`]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>
      ) : null}
      <div className={s.card}>
        {ACCOUNT_ROWS.map((r) => (
          <ListRow key={r.to} title={r.title} sub={r.sub} d={r.d} onTap={() => push(r.to)} />
        ))}
      </div>
      <ToggleRow
        title="حالت تیره"
        sub="مناسب کار در شب"
        on={theme === 'dark'}
        onFlip={() => setMode(theme === 'dark' ? 'light' : 'dark')}
      />
      <button
        type="button"
        className={s.logout}
        onClick={() => openOverlay({ kind: 'confirm', props: { action: 'logout' } })}
      >
        خروج از حساب
      </button>
      <p className={s.version}>نسخه‌ی {toFaDigits(__APP_VERSION__).replace(/\./g, '٫')}</p>
      {config.useMocks ? (
        // Mock/demo builds only: preview every full-page error (D-106).
        <section aria-label="پیش‌نمایش صفحه‌های خطا">
          <h2 className={s.title}>پیش‌نمایش صفحه‌های خطا (نسخه‌ی نمایشی)</h2>
          <div className={s.chips}>
            {ERROR_KINDS.map((k) => (
              <FilterChip
                key={k}
                label={toFaDigits(k.replace(/^e/, ''))}
                onPick={() =>
                  k === 'maintenance' || k === 'update' ? resetTo('error', { kind: k }) : showError(k)
                }
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
