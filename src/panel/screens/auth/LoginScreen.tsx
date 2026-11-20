import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/base/Button';
import { TextField } from '@/components/base/TextField';
import { TopBar } from '@/components/library/TopBar';
import { config } from '@/config/env';
import { formatPhone, toFaDigits } from '@/lib/format';
import { panelApi } from '../../api/client';
import { businessError } from '../../api/errors';
import { completeSignIn, panelDeviceId } from '../../auth/flow';
import { isValidOtp, isValidPhone, normalizePhone, phoneError } from '../../auth/validation';
import { showFullPageError } from '../../errors/fullPage';
import { setPanelBackInterceptor, usePanelNav } from '../../nav/nav';
import type { PanelScreenProps } from '../StackScreens';
import { AuthHero } from './AuthHero';
import s from './auth.module.css';

/** Restaurant screen specs §1: the 429 text is the same whatever the server says. */
export const RATE_LIMIT_TEXT = 'چند دقیقه دیگر دوباره تلاش کنید';
const NETWORK_TEXT = 'ارتباط برقرار نشد. اتصال را بررسی کنید و دوباره تلاش کنید.';

/** Wall clock for the resend deadline (module-level: only called from event handlers). */
const clock = () => Date.now();

const mmss = (sec: number) =>
  toFaDigits(`${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`);

/**
 * Login in two phases on one screen (KAN-59): mobile number → SMS code. «ویرایش شماره» and back
 * (also Android back) return from the code to the number. `mode=register` is the «رستوران جدید هستم»
 * path: same verification, then the registration wizard.
 */
export function LoginScreen({ route }: PanelScreenProps) {
  const register = route.params.mode === 'register';
  const [phase, setPhase] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [len, setLen] = useState(4);
  /** Phone the last code went to, and when it may be re-sent (deadline: timers throttle in background). */
  const [sentTo, setSentTo] = useState('');
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(0);
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const normalized = normalizePhone(phone);
  const left = Math.max(0, Math.ceil((deadline - now) / 1000));

  useEffect(() => {
    setPanelBackInterceptor(route.key, () => {
      if (phaseRef.current !== 'code') return false;
      setPhase('phone');
      setError('');
      return true;
    });
    return () => setPanelBackInterceptor(route.key, null);
  }, [route.key]);

  useEffect(() => {
    if (phase !== 'code' || left <= 0) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [phase, left > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const requestCode = async (): Promise<boolean> => {
    setBusy(true);
    setError('');
    try {
      const {
        data,
        error: err,
        response,
      } = await panelApi().POST('/r/auth/otp/request', {
        body: { phone: normalized },
      });
      if (response.status === 429) {
        setError(RATE_LIMIT_TEXT);
        return false;
      }
      if (err !== undefined || !data) {
        setError(businessError(err)?.message ?? NETWORK_TEXT);
        return false;
      }
      const t = clock();
      setLen(data.codeLength ?? 4);
      setSentTo(normalized);
      setNow(t);
      setDeadline(t + (data.resendAfterSec ?? 120) * 1000);
      return true;
    } catch (e) {
      if (!showFullPageError(e, () => void requestCode())) setError(NETWORK_TEXT);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const toCode = async () => {
    if (!isValidPhone(normalized) || busy) return;
    // Same number, code still valid («ویرایش شماره» then back): no new SMS, no 429.
    const ok = (sentTo === normalized && clock() < deadline) || (await requestCode());
    if (!ok) return;
    setCode('');
    setError('');
    setPhase('code');
  };

  const resend = async () => {
    if ((await requestCode()) && phaseRef.current === 'code') setCode('');
  };

  const verify = async (value: string) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const {
        data,
        error: err,
        response,
      } = await panelApi().POST('/r/auth/otp/verify', {
        body: { phone: normalized, code: value, deviceId: panelDeviceId() },
      });
      if (err !== undefined || !data?.accessToken) {
        setError(response.status === 429 ? RATE_LIMIT_TEXT : (businessError(err)?.message ?? NETWORK_TEXT));
        setCode('');
        setShake((n) => n + 1);
        return;
      }
      completeSignIn(data, register ? 'register' : 'login');
    } catch (e) {
      if (!showFullPageError(e, () => void verify(value))) setError(NETWORK_TEXT);
    } finally {
      setBusy(false);
    }
  };

  const onCode = (v: string) => {
    setCode(v);
    setError('');
    if (isValidOtp(v, len)) void verify(v); // SMS autofill or the last digit → submit
  };

  const back = () => {
    if (phase === 'code') {
      setPhase('phone');
      setError('');
    } else usePanelNav.getState().back();
  };

  return (
    <div className={s.wrap}>
      {register ? <TopBar title="ثبت‌نام رستوران" onBack={back} /> : null}
      {register ? null : (
        <AuthHero tag="پنل رستوران" art="dk-kebab" text="سفارش‌های رستورانت را همین‌جا مدیریت کن." />
      )}
      <form
        className={s.body}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (phase === 'phone') void toCode();
          else if (isValidOtp(code, len)) void verify(code);
        }}
      >
        {phase === 'phone' ? (
          <>
            <h2>{register ? 'ثبت‌نام رستوران جدید' : 'ورود به پنل رستوران'}</h2>
            {register ? (
              <p className={s.lede}>
                اول شماره‌ی موبایل مدیر رستوران را تأیید کنید؛ بعد اطلاعات، مدارک و شبا را وارد می‌کنید.
              </p>
            ) : null}
            <TextField
              label="شماره‌ی موبایل مدیر رستوران"
              value={phone}
              onChange={(v) => {
                setPhone(v);
                setError('');
              }}
              numeric
              maxDigits={11}
              size="lg"
              autoComplete="tel"
              inputMode="numeric"
              placeholder="۰۹۱۲ ۳۴۵ ۶۷۸۹"
              hint="کد تأیید برای همین شماره پیامک می‌شود."
              error={phoneError(phone)}
            />
            {error ? (
              <p className={s.error} role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" size="lg" block disabled={!isValidPhone(normalized)} loading={busy}>
              دریافت کد تأیید
            </Button>
            {register ? null : (
              <button
                type="button"
                className={s.link}
                onClick={() => usePanelNav.getState().push('login', { mode: 'register' })}
              >
                رستوران جدید هستم، ثبت‌نام می‌کنم
              </button>
            )}
          </>
        ) : (
          <>
            <h2>کد تأیید را وارد کنید</h2>
            <p className={s.lede}>
              کد {toFaDigits(len)} رقمی به <bdi dir="ltr">{formatPhone(normalized)}</bdi> پیامک شد.
            </p>
            <TextField
              key={shake}
              className={shake ? s.shake : undefined}
              inputClassName={s.codeInput}
              label={`کد ${toFaDigits(len)} رقمی`}
              value={code}
              onChange={onCode}
              numeric
              maxDigits={len}
              size="lg"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              error={error || undefined}
            />
            <Button type="submit" size="lg" block disabled={!isValidOtp(code, len)} loading={busy}>
              ورود
            </Button>
            <button
              type="button"
              className={s.link}
              onClick={() => {
                setPhase('phone');
                setError('');
              }}
            >
              ویرایش شماره
            </button>
            <p className={s.timer} aria-live="polite">
              {left > 0 ? `ارسال دوباره‌ی کد تا ${mmss(left)} دیگر` : 'کد را دریافت نکردید؟'}
            </p>
            <button
              type="button"
              className={s.link}
              disabled={left > 0 || busy}
              onClick={() => void resend()}
            >
              ارسال دوباره‌ی کد
            </button>
          </>
        )}
        {config.useMocks ? (
          <p className={s.demo}>
            نسخه‌ی نمایشی: کد {toFaDigits('1234')} · ثبت‌نام تازه با {toFaDigits('09130000000')}
          </p>
        ) : null}
      </form>
    </div>
  );
}
