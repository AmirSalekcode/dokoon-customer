import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { useAuthFlow } from '@/auth/flow';
import { Button } from '@/components/base/Button';
import { TextField } from '@/components/base/TextField';
import { TopBar } from '@/components/library/TopBar';
import { Icon } from '@/components/primitives/Icon';
import { Logo } from '@/components/primitives/Logo';
import { isValidPhone } from '@/lib/format';
import { setBackInterceptor, useNav } from '@/nav/nav';
import type { ScreenProps } from '../registry';
import s from './auth.module.css';

/** Phone entry (screen-specs §1 login). Login is reached from a guarded action (D-59), so it has back. */
export function LoginScreen({ route }: ScreenProps) {
  const [phone, setPhone] = useState('');
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const valid = isValidPhone(phone);
  const fieldError =
    phone.length >= 11 && !valid ? 'شماره‌ی موبایل معتبر نیست (مثل ۰۹۱۲۳۴۵۶۷۸۹).' : undefined;

  // Leaving login (back button or system back) drops the pending intent.
  useEffect(() => {
    setBackInterceptor(route.key, () => {
      useAuthFlow.getState().setIntent(null);
      return false;
    });
    return () => setBackInterceptor(route.key, null);
  }, [route.key]);

  const close = () => {
    useAuthFlow.getState().setIntent(null);
    useNav.getState().back();
  };

  const send = async () => {
    if (!valid || !terms || busy) return;
    setBusy(true);
    setServerError('');
    try {
      const { data, error } = await api.POST('/auth/otp/request', { body: { phone } });
      if (error || !data) {
        setServerError(
          (error as { message?: string } | undefined)?.message ?? 'ارسال کد ممکن نشد. دوباره تلاش کنید.',
        );
        return;
      }
      useNav.getState().push('otp', {
        phone,
        resend: String(data.resendAfterSec ?? 120),
        len: String(data.codeLength ?? 4),
      });
    } catch {
      setServerError('ارسال کد ممکن نشد. اتصال را بررسی کنید.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <TopBar title="" onBack={close} />
      <div className={`${s.au} ${s.form}`}>
        <Logo height={48} />
        <h1>ورود یا ثبت‌نام</h1>
        <p>شماره‌ی موبایل خود را وارد کنید تا کد تأیید برایتان پیامک شود.</p>
        <TextField
          className={s.w100}
          label="شماره‌ی موبایل"
          value={phone}
          onChange={(v) => {
            setPhone(v);
            setServerError('');
          }}
          numeric
          maxDigits={11}
          size="lg"
          autoComplete="tel"
          placeholder="۰۹۱۲ ۳۴۵ ۶۷۸۹"
          error={fieldError}
        />
        <div className={s.terms}>
          <button
            type="button"
            role="checkbox"
            aria-checked={terms}
            aria-label="پذیرش قوانین و مقررات دکون"
            className={[s.cb, terms && s.cbOn].filter(Boolean).join(' ')}
            onClick={() => setTerms((t) => !t)}
          >
            <Icon name="check" size={16} />
          </button>
          <span>
            با ورود،{' '}
            <button
              type="button"
              className={s.link}
              onClick={() => useNav.getState().push('legal', { doc: 'terms' })}
            >
              قوانین و مقررات
            </button>{' '}
            دکون را می‌پذیرم.
          </span>
        </div>
        {serverError ? (
          <p className={s.serverError} role="alert">
            {serverError}
          </p>
        ) : null}
        <div className={s.foot}>
          <Button size="lg" block disabled={!valid || !terms} loading={busy} onClick={() => void send()}>
            دریافت کد تأیید
          </Button>
        </div>
      </div>
    </div>
  );
}
