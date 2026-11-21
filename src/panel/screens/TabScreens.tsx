import { FilterChip } from '@/components/library/FilterChip';
import { ListRow } from '@/components/library/ListRow';
import { ToggleRow } from '@/components/library/ToggleRow';
import { config } from '@/config/env';
import { toFaDigits } from '@/lib/format';
import { useTheme } from '@/theme/theme';
import { ERROR_KINDS } from '../errors/panelErrors';
import { usePanelNav } from '../nav/nav';
import s from './screens.module.css';

/*
 * Root tab screens of the shell (KAN-58). Their real content arrives with the feature tasks:
 * account KAN-69/70.
 */

const D_SOUND = 'M5 10v4h3l5 4V6l-5 4zM17 9a4 4 0 0 1 0 6';
const D_LOGOUT = 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10';
const D_HELP =
  'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01';

export function AccountScreen() {
  const theme = useTheme((st) => st.theme);
  const setMode = useTheme((st) => st.setMode);
  const { push, showError, resetTo, openOverlay } = usePanelNav.getState();
  return (
    <div className={s.page}>
      <div className={s.card}>
        <ListRow
          title="صدا و هشدار"
          sub="زنگ سفارش جدید، بلندی صدا، لرزش"
          d={D_SOUND}
          onTap={() => push('sound')}
        />
        <ListRow title="راهنما و پشتیبانی" d={D_HELP} onTap={() => push('help')} />
      </div>
      <div className={s.card}>
        <ToggleRow
          title="حالت تیره"
          on={theme === 'dark'}
          onFlip={() => setMode(theme === 'dark' ? 'light' : 'dark')}
        />
      </div>
      <div className={s.card}>
        <ListRow
          title="خروج از حساب"
          sub="فقط همین دستگاه خارج می‌شود"
          d={D_LOGOUT}
          onTap={() => openOverlay({ kind: 'confirm', props: { action: 'logout' } })}
        />
      </div>
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
