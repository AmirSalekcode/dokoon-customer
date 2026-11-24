import { ListRow } from '@/components/library/ListRow';
import { ToggleRow } from '@/components/library/ToggleRow';
import { TopBar } from '@/components/library/TopBar';
import { toFaDigits } from '@/lib/format';
import { useTheme } from '@/theme/theme';
import { signOutToLogin } from '../auth/flow';
import { useCourierNav } from '../nav/nav';
import s from './screens.module.css';

/**
 * Tab roots. The orders tab lives in `orders/OrdersScreen` (KAN-93), earnings in `earn/EarnScreen`
 * (KAN-98); the account tab below grows with KAN-100/101.
 */
export { OrdersScreen as OrdersTab } from './orders/OrdersScreen';

/** Account tab: the dark-mode switch (stored in `dk-theme`) and sign-out behind a confirmation. */
export function AccountTab() {
  const theme = useTheme((st) => st.theme);
  const setMode = useTheme((st) => st.setMode);
  const openOverlay = useCourierNav((st) => st.openOverlay);
  const closeOverlay = useCourierNav((st) => st.closeOverlay);

  const askSignOut = () =>
    openOverlay({
      kind: 'dlg',
      props: {
        title: 'از حساب خارج می‌شوید؟',
        text: 'تا ورود دوباره، روی این دستگاه پیشنهاد سفارش دریافت نمی‌کنید.',
        confirmLabel: 'خروج',
        tone: 'danger',
        onConfirm: () => {
          closeOverlay();
          signOutToLogin();
        },
      },
    });

  return (
    <div className={s.page}>
      <TopBar title="حساب" />
      <ListRow
        title="تاریخچه‌ی سفارش‌ها"
        sub="سفارش‌های تحویل‌شده"
        d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2"
        onTap={() => useCourierNav.getState().push('hist')}
      />
      <ListRow
        title="تسویه‌حساب‌ها"
        sub="واریزهای هفتگی"
        d="M4 7h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12M16 14h2"
        onTap={() => useCourierNav.getState().push('settle')}
      />
      <ListRow
        title="مجوزهای دستگاه"
        sub="موقعیت مکانی، اعلان‌ها"
        d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"
        onTap={() => useCourierNav.getState().push('perm')}
      />
      <ToggleRow
        title="حالت تیره"
        sub="مناسب کار در شب"
        on={theme === 'dark'}
        onFlip={() => setMode(theme === 'dark' ? 'light' : 'dark')}
      />
      <button type="button" className={s.signOut} onClick={askSignOut}>
        خروج از حساب
      </button>
      <p className={s.version}>نسخه‌ی {toFaDigits(__APP_VERSION__)}</p>
    </div>
  );
}
