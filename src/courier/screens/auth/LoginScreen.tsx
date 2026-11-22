import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/base/Button';
import { TextField } from '@/components/base/TextField';
import { TopBar } from '@/components/library/TopBar';
import { Art } from '@/components/primitives/Art';
import { Logo } from '@/components/primitives/Logo';
import { config } from '@/config/env';
import { formatMmss, formatPhone, toFaDigits } from '@/lib/format';
import { isValidOtp, isValidPhone, normalizePhone, phoneError } from '@/lib/validation';
import { toast } from '@/ui/toast';
import { courierApi, verifyOtp } from '../../api/client';
import { businessError } from '../../api/errors';
import { useCourierSession } from '../../api/session';
import { enter } from '../../auth/flow';
import { CookieCard } from '../../consent/CookieCard';
import { syncCourierConsent } from '../../consent/consent';
import { showFullPageError } from '../../errors/fullPage';
import { setCourierBackInterceptor, useCourierNav } from '../../nav/nav';
import type { CourierScreenProps } from '../types';
import s from './auth.module.css';

/** Courier screen specs «ورود»: the 429 text is the same whatever the server says. */
export const RATE_LIMIT_TEXT = 'چند دقیقه دیگر دوباره تلاش کنید';
const NETWORK_TEXT = 'ارتباط برقرار نشد. اتصال را بررسی کنید و دوباره تلاش کنید.';
const WRONG_CODE_TEXT = 'کد واردشده درست نیست';
/** The courier contract's `/c/auth/otp` answers `204` with no body: 4 digits, re-send after 2 minutes. */
export const CODE_LENGTH = 4;
export const RESEND_SEC = 120;

/** Wall clock for the resend deadline (module-level: only called from event handlers). */
const clock = () => Date.now();

/**
 * Courier login (KAN-90) in two phases on one screen: mobile number → SMS code. «ویرایش شماره» and back
 * (also Android back) return from the code to the number. `mode=register` is «پیک جدید هستم»: the same
 * verification (registration needs the verified phone's session, contract-notes 31), then registration.
 */
export function LoginScreen({ route }: CourierScreenProps) {
  const register = route.params.mode === 'register';
  const [phase, setPhase] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
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
    setCourierBackInterceptor(route.key, () => {
      if (phaseRef.current !== 'code') return false;
      setPhase('phone');
      setError('');
      return true;
    });
    return () => setCourierBackInterceptor(route.key, null);
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
      const { error: err, response } = await courierApi().POST('/c/auth/otp', {
        body: { phone: normalized },
      });
      if (response.status === 429) {
        setError(RATE_LIMIT_TEXT);
        return false;
      }
      if (err !== undefined || !response.ok) {
        setError(businessError(err)?.message ?? NETWORK_TEXT);
        return false;
      }
      const t = clock();
      setSentTo(normalized);
      setNow(t);
      setDeadline(t + RESEND_SEC * 1000);
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
      const api = courierApi();
      const { data, error: err, response } = await verifyOtp(api, normalized, value);
      if (err !== undefined || !data) {
        setError(
          response.status === 429
            ? RATE_LIMIT_TEXT
            : response.status === 401
              ? (businessError(err)?.message ?? WRONG_CODE_TEXT)
              : (businessError(err)?.message ?? NETWORK_TEXT),
        );
        setCode('');
        setShake((n) => n + 1);
        return;
      }
      const status = useCourierSession.getState().status;
      await enter(status);
      void syncCourierConsent(api);
      if (register && status !== 'new') toast('این شماره قبلاً ثبت‌نام کرده است؛ وارد حساب شدید', 'info', 2600);
    } catch (e) {
      if (!showFullPageError(e, () => void verify(value))) setError(NETWORK_TEXT);
    } finally {
      setBusy(false);
    }
  };

  const onCode = (v: string) => {
    setCode(v);
    setError('');
    if (isValidOtp(v, CODE_LENGTH)) void verify(v); // SMS autofill or the last digit → submit
  };

  const back = () => {
    if (phase === 'code') {
      setPhase('phone');
      setError('');
    } else useCourierNav.getState().back();
  };

  return (
    <div className={s.wrap}>
      {register ? (
        <TopBar title="ثبت‌نام پیک" onBack={back} />
      ) : (
        <header className={s.hero}>
          <Logo height={50} />
          <span className={s.tag}>اپ پیک</span>
          <Art src="dk-fries" className={s.art} />
          <p>سفارش بگیر، تحویل بده، درآمدت را همان روز ببین.</p>
        </header>
      )}
      <form
        className={s.body}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (phase === 'phone') void toCode();
          else if (isValidOtp(code, CODE_LENGTH)) void verify(code);
        }}
      >
        {phase === 'phone' ? (
          <>
            <h2>{register ? 'ثبت‌نام پیک جدید' : 'ورود به اپ پیک'}</h2>
            {register ? (
              <p className={s.lede}>
                اول شماره‌ی موبایل خودتان را تأیید کنید؛ بعد اطلاعات، مدارک و شبا را وارد می‌کنید.
              </p>
            ) : null}
            <TextField
              label="شماره‌ی موبایل"
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
                onClick={() => useCourierNav.getState().push('login', { mode: 'register' })}
              >
                پیک جدید هستم، ثبت‌نام می‌کنم
              </button>
            )}
          </>
        ) : (
          <>
            <h2>کد تأیید را وارد کنید</h2>
            <p className={s.lede}>
              کد {toFaDigits(CODE_LENGTH)} رقمی به <bdi dir="ltr">{formatPhone(normalized)}</bdi> پیامک شد.
            </p>
            <TextField
              key={shake}
              className={shake ? s.shake : undefined}
              inputClassName={s.codeInput}
              label={`کد ${toFaDigits(CODE_LENGTH)} رقمی`}
              value={code}
              onChange={onCode}
              numeric
              maxDigits={CODE_LENGTH}
              size="lg"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              error={error || undefined}
            />
            <Button type="submit" size="lg" block disabled={!isValidOtp(code, CODE_LENGTH)} loading={busy}>
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
              {left > 0 ? `ارسال دوباره‌ی کد تا ${formatMmss(left)} دیگر` : 'کد را دریافت نکردید؟'}
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
            نسخه‌ی نمایشی: کد {toFaDigits('1234')} · ثبت‌نام تازه {toFaDigits('09120000001')} · در انتظار
            تأیید {toFaDigits('09120000002')}
          </p>
        ) : null}
      </form>
      <CookieCard />
    </div>
  );
}
