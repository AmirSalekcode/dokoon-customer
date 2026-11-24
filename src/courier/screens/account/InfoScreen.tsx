import { useEffect } from 'react';
import { Button } from '@/components/base/Button';
import { ErrorState } from '@/components/library/ErrorState';
import { InfoList } from '@/components/library/InfoList';
import { LoadingState } from '@/components/library/LoadingState';
import { TopBar } from '@/components/library/TopBar';
import { useCourierMe } from '../../account/me';
import { infoRows } from '../../account/present';
import { useCourierNav } from '../../nav/nav';
import s from './account.module.css';

/**
 * «اطلاعات من» (KAN-100): name, masked mobile, national code, plate and Sheba as the server masked them.
 * Changing the Sheba is a request (fresh SMS code + city manager review); while one is pending the page
 * says so instead of offering a second request.
 */
export function InfoScreen() {
  const me = useCourierMe((st) => st.me);
  const status = useCourierMe((st) => st.status);
  useEffect(() => {
    if (!useCourierMe.getState().me) void useCourierMe.getState().load();
  }, []);

  let body;
  if (me) {
    body = (
      <>
        <InfoList rows={infoRows(me)} />
        {me.shebaChangePending ? (
          <p className={s.pending} role="status">
            درخواست تغییر شبای شما ثبت شده و مدیر شهر در حال بررسی آن است. تا تأیید، تسویه‌ها به شبای فعلی
            واریز می‌شود.
          </p>
        ) : (
          <>
            <p className={s.note}>برای تغییر شماره‌ی شبا، کد تأیید پیامکی لازم است و مدیر شهر آن را بررسی می‌کند.</p>
            <Button block variant="secondary" onClick={() => useCourierNav.getState().push('sheba')}>
              درخواست تغییر شبا
            </Button>
          </>
        )}
      </>
    );
  } else if (status === 'error')
    body = <ErrorState text="اطلاعات حساب دریافت نشد." onRetry={() => void useCourierMe.getState().load()} />;
  else body = <LoadingState variant="list" rows={4} />;

  return (
    <div className={s.page}>
      <TopBar title="اطلاعات من" onBack={() => useCourierNav.getState().back()} />
      {body}
    </div>
  );
}
