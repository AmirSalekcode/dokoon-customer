import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { Button } from '@/components/base/Button';
import { TextField } from '@/components/base/TextField';
import { setBackInterceptor, useNav } from '@/nav/nav';
import { toast } from '@/ui/toast';
import type { ScreenProps } from '../registry';
import s from './auth.module.css';

const REF = /^DOKOON-[A-Z0-9]+$/;

/** New account: name (required, for «سلام … عزیز» and delivery) + optional referral code. */
export function SetupScreen({ route }: ScreenProps) {
  const [name, setName] = useState('');
  const [ref, setRef] = useState('');
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const refCode = ref.trim().toUpperCase();
  const refError = refCode && !REF.test(refCode) ? 'کد معرف معتبر نیست.' : undefined;
  const ok = name.trim().length >= 2 && !refError;

  // The account exists already; without a name the app cannot greet or deliver. Back is blocked.
  useEffect(() => {
    setBackInterceptor(route.key, () => {
      toast('برای ادامه، نام خود را وارد کنید.');
      return true;
    });
    return () => setBackInterceptor(route.key, null);
  }, [route.key]);

  const save = async () => {
    if (!ok || busy) return;
    setBusy(true);
    setServerError('');
    try {
      const body = { name: name.trim(), ...(refCode ? { referralCode: refCode } : {}) };
      const { data, error } = await api.PATCH('/me', { body });
      if (error || !data) {
        setServerError(
          (error as { message?: string } | undefined)?.message ?? 'ذخیره ممکن نشد. دوباره تلاش کنید.',
        );
        return;
      }
      const prev = useSession.getState().user;
      useSession.getState().setUser({ ...prev, ...data, name: data.name ?? body.name });
      useNav.getState().setTop('perms');
    } catch {
      setServerError('ذخیره ممکن نشد. اتصال را بررسی کنید.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={s.au}>
      <h1>تکمیل پروفایل</h1>
      <p>برای سلام گفتن و تحویل سفارش، نام شما لازم است.</p>
      <div className={s.fields}>
        <TextField
          label="نام و نام خانوادگی"
          value={name}
          onChange={setName}
          autoComplete="name"
          placeholder="مثلاً امیر رضایی"
          size="lg"
        />
        <TextField
          label="کد معرف (اختیاری)"
          value={ref}
          onChange={(v) => {
            setRef(v);
            setServerError('');
          }}
          dir="ltr"
          autoCapitalize="characters"
          placeholder="DOKOON-..."
          error={refError}
        />
      </div>
      {serverError ? (
        <p className={s.serverError} role="alert">
          {serverError}
        </p>
      ) : null}
      <div className={s.foot}>
        <Button size="lg" block disabled={!ok} loading={busy} onClick={() => void save()}>
          ادامه
        </Button>
      </div>
    </div>
  );
}
