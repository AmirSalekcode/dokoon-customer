import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { completeLogin } from '@/auth/flow';
import { useSession } from '@/auth/session';
import { Button } from '@/components/base/Button';
import { TextField } from '@/components/base/TextField';
import { TopBar } from '@/components/library/TopBar';
import { config } from '@/config/env';
import { formatMmss, formatPhone, toFaDigits } from '@/lib/format';
import { readStorage, writeStorage } from '@/lib/storage';
import { useNav } from '@/nav/nav';
import { toast } from '@/ui/toast';
import type { ScreenProps } from '../registry';
import s from './auth.module.css';

/** Stable per-install id sent with OTP verify (server binds refresh tokens / push to devices). */
function deviceId(): string {
  let id = readStorage('dk-device');
  if (!id) {
    id = crypto.randomUUID();
    writeStorage('dk-device', id);
  }
  return id;
}

/** OTP code entry (screen-specs §1 otp): countdown, resend, wrong-code feedback, auto-submit. */
export function OtpScreen({ route }: ScreenProps) {
  const phone = route.params.phone ?? '';
  const len = Number(route.params.len ?? 4);
  const [code, setCode] = useState('');
  // Countdown from a deadline, not chained timeouts: background tabs throttle timers (user is in the SMS app).
  const [deadline, setDeadline] = useState(() => Date.now() + Number(route.params.resend ?? 120) * 1000);
  const [now, setNow] = useState(() => Date.now());
  const left = Math.max(0, Math.ceil((deadline - now) / 1000));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(0);

  useEffect(() => {
    if (left <= 0) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [left > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const verify = async (value: string) => {
    setBusy(true);
    setError('');
    try {
      const { data, error: err } = await api.POST('/auth/otp/verify', {
        body: { phone, code: value, deviceId: deviceId() },
      });
      if (err || !data?.accessToken || !data.refreshToken) {
        setError('کد واردشده درست نیست.');
        setCode('');
        setShake((n) => n + 1);
        return;
      }
      useSession
        .getState()
        .setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user });
      completeLogin({ isNewUser: !!data.isNewUser });
    } catch {
      setError('تأیید کد ممکن نشد. اتصال را بررسی کنید.');
    } finally {
      setBusy(false);
    }
  };

  const onChange = (v: string) => {
    setCode(v);
    setError('');
    if (v.length === len && !busy) void verify(v); // SMS autofill or last digit → submit
  };

  const resend = async () => {
    try {
      const { data, error: err } = await api.POST('/auth/otp/request', { body: { phone } });
      if (err || !data) {
        toast((err as { message?: string } | undefined)?.message ?? 'ارسال دوباره ممکن نشد.', 'error');
        return;
      }
      const t = Date.now();
      setNow(t);
      setDeadline(t + (data.resendAfterSec ?? 120) * 1000);
      toast('کد دوباره ارسال شد');
    } catch {
      toast('ارسال دوباره ممکن نشد.', 'error');
    }
  };

  return (
    <div>
      <TopBar title="" onBack={() => useNav.getState().back()} />
      <div className={`${s.au} ${s.form}`}>
        <h1>کد تأیید</h1>
        <p>
          کد {toFaDigits(len)} رقمی ارسال‌شده به <bdi dir="ltr">{formatPhone(phone)}</bdi> را وارد کنید.
        </p>
        <TextField
          key={shake}
          className={`${s.w100} ${shake ? s.shake : ''}`}
          label="کد تأیید"
          value={code}
          onChange={onChange}
          numeric
          maxDigits={len}
          size="lg"
          autoComplete="one-time-code"
          autoFocus
          error={error || undefined}
          inputClassName={s.code}
        />
        <button type="button" className={s.link} onClick={() => useNav.getState().back()}>
          ویرایش شماره
        </button>
        <p className={s.timer} aria-live="polite">
          {left > 0 ? `ارسال مجدد کد تا ${formatMmss(left)} دیگر` : 'کد را دریافت نکردید؟'}
        </p>
        <Button variant="ghost" disabled={left > 0} onClick={() => void resend()}>
          ارسال مجدد کد
        </Button>
        {config.useMocks ? <small className={s.hint}>نسخه‌ی آزمایشی: کد ۱۲۳۴ را وارد کنید.</small> : null}
        <div className={s.foot}>
          <Button
            size="lg"
            block
            disabled={code.length < len}
            loading={busy}
            onClick={() => void verify(code)}
          >
            تأیید و ورود
          </Button>
        </div>
      </div>
    </div>
  );
}
