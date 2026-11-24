import { useEffect } from 'react';
import { ListRow } from '@/components/library/ListRow';
import { ToggleRow } from '@/components/library/ToggleRow';
import { TopBar } from '@/components/library/TopBar';
import { Art } from '@/components/primitives/Art';
import { toFaDigits } from '@/lib/format';
import { useTheme } from '@/theme/theme';
import { docsSummary } from '../../account/docs';
import { useCourierMe } from '../../account/me';
import { cardSub } from '../../account/present';
import { useCourierSession } from '../../api/session';
import { signOutToLogin } from '../../auth/flow';
import { useCourierNav } from '../../nav/nav';
import s from './account.module.css';

const push = (screen: Parameters<ReturnType<typeof useCourierNav.getState>['push']>[0]) =>
  useCourierNav.getState().push(screen);

const D_USER = 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21a8 8 0 0 1 16 0';
const D_CLOCK = 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2';
const D_WALLET = 'M4 7h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12M16 14h2';
const D_DOC = 'M7 3h7l4 4v14H7zM14 3v5h4';
const D_LOCK = 'M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3';
const D_HELP =
  'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01';
const D_SHIELD = 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z';

/**
 * Account tab (KAN-100, courier screen specs «حساب»): the courier card from `GET /c/me` (name, masked
 * mobile, city), sub-pages, the dark switch (`dk-theme`) and sign-out behind a confirmation.
 */
export function AccountScreen() {
  const theme = useTheme((st) => st.theme);
  const setMode = useTheme((st) => st.setMode);
  const me = useCourierMe((st) => st.me);
  const fallbackName = useCourierSession((st) => st.name);
  useEffect(() => {
    void useCourierMe.getState().load();
  }, []);

  const askSignOut = () =>
    useCourierNav.getState().openOverlay({
      kind: 'dlg',
      props: {
        title: 'از حساب خارج می‌شوید؟',
        text: 'تا ورود دوباره، روی این دستگاه پیشنهاد سفارش دریافت نمی‌کنید.',
        confirmLabel: 'خروج',
        tone: 'danger',
        onConfirm: () => {
          useCourierNav.getState().closeOverlay();
          signOutToLogin();
        },
      },
    });

  const name = me?.name || fallbackName;
  const docs = docsSummary(me?.docs);
  return (
    <div className={s.page}>
      <TopBar title="حساب" />
      <section className={s.card} aria-label="کارت پیک">
        <span className={s.avatar}>
          <Art src="dk-fries" />
        </span>
        <div className={s.who}>
          <h3>{name || 'پیک دکون'}</h3>
          {me ? <p>{cardSub(me)}</p> : null}
        </div>
      </section>
      <ListRow title="اطلاعات من" sub="نام، پلاک، شبا" d={D_USER} onTap={() => push('info')} />
      <ListRow title="مدارک من" sub={docs.sub} d={D_DOC} dot={docs.dot}
        dotLabel="نیاز به اقدام" onTap={() => push('docs')} />
      <ListRow title="تاریخچه‌ی سفارش‌ها" sub="سفارش‌های تحویل‌شده" d={D_CLOCK} onTap={() => push('hist')} />
      <ListRow title="تسویه‌حساب‌ها" sub="واریزهای هفتگی" d={D_WALLET} onTap={() => push('settle')} />
      <ListRow title="مجوزهای دستگاه" sub="موقعیت مکانی، اعلان‌ها" d={D_SHIELD} onTap={() => push('perm')} />
      <ListRow title="کوکی‌ها و حریم خصوصی" sub="مدیریت داده‌های اختیاری" d={D_LOCK} onTap={() => push('cookies')} />
      <ListRow title="پشتیبانی" sub="تماس با مدیر شهر، پرسش‌های پرتکرار" d={D_HELP} onTap={() => push('support')} />
      <ToggleRow
        title="حالت تیره"
        sub="مناسب کار در شب"
        on={theme === 'dark'}
        onFlip={() => setMode(theme === 'dark' ? 'light' : 'dark')}
      />
      <button type="button" className={s.signOut} onClick={askSignOut}>
        خروج از حساب
      </button>
      <p className={s.version}>دکون پیک · نسخه‌ی {toFaDigits(__APP_VERSION__)}</p>
    </div>
  );
}
