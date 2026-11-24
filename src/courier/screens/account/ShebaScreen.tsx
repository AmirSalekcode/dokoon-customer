import { useState } from 'react';
import { Button } from '@/components/base/Button';
import { TextField } from '@/components/base/TextField';
import { TopBar } from '@/components/library/TopBar';
import { normalizeDigits } from '@/lib/format';
import { isValidOtp, isValidSheba, normalizeSheba, shebaError } from '@/lib/validation';
import { toast } from '@/ui/toast';
import { useCourierMe } from '../../account/me';
import { ltr, maskPhone } from '../../account/present';
import { courierApi } from '../../api/client';
import { businessError } from '../../api/errors';
import { showFullPageError } from '../../errors/fullPage';
import { useCourierNav } from '../../nav/nav';
import s from './account.module.css';

const NETWORK = 'ارتباط برقرار نشد؛ اتصال را بررسی کنید';
const CODE_LENGTH = 4;

/**
 * «درخواست تغییر شبا» (KAN-100, courier rule 2): the new Sheba (mod-97 checked) → a fresh SMS code to the
 * courier's own mobile (`POST /c/auth/otp`) → `POST /c/sheba-change {sheba, otpCode}` (proposed body,
 * contract-notes 35) → the city manager reviews it; settlements keep the current Sheba until approved.
 */
export function ShebaScreen() {
  const phone = useCourierMe((st) => st.me?.phone ?? '');
  const [sheba, setSheba] = useState('');
  const [code, setCode] = useState('');
  const [phase, setPhase] = useState<'form' | 'code'>('form');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const back = () => useCourierNav.getState().back();

  const sendCode = async () => {
    if (!isValidSheba(sheba) || !phone || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const { error: e } = await courierApi().POST('/c/auth/otp', { body: { phone } });
      if (e !== undefined) setError(businessError(e)?.message ?? NETWORK);
      else setPhase('code');
    } catch (e) {
      if (!showFullPageError(e, () => void sendCode())) setError(NETWORK);
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!isValidOtp(code, CODE_LENGTH) || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      // The contract has no body yet (contract-notes 35): send the proposed one.
      const body = { sheba: normalizeSheba(sheba), otpCode: normalizeDigits(code) } as never;
      const { error: e } = await courierApi().POST('/c/sheba-change', { body });
      if (e !== undefined) {
        setError(businessError(e)?.message ?? NETWORK);
        return;
      }
      useCourierMe.getState().markShebaPending();
      toast('درخواست تغییر شبا ثبت شد؛ بعد از تأیید مدیر شهر اعمال می‌شود', 'success');
      back();
    } catch (e) {
      if (!showFullPageError(e, () => void submit())) setError(NETWORK);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={s.page}>
      <TopBar title="درخواست تغییر شبا" onBack={back} />
      <p className={s.note}>
        شبای تازه باید به نام خودتان باشد. بعد از تأیید مدیر شهر، تسویه‌های بعدی به آن واریز می‌شود.
      </p>
      {phase === 'form' ? (
        <>
          <TextField
            label="شماره‌ی شبای تازه"
            value={sheba}
            ltr
            placeholder="IR…"
            maxLength={34}
            autoComplete="off"
            error={shebaError(sheba)}
            onChange={setSheba}
          />
          {error ? (
            <p className={s.err} role="alert">
              {error}
            </p>
          ) : null}
          <Button block loading={busy} disabled={!isValidSheba(sheba) || !phone} onClick={() => void sendCode()}>
            ارسال کد تأیید
          </Button>
          {phone ? <p className={s.note}>کد به شماره‌ی {ltr(maskPhone(phone))} فرستاده می‌شود.</p> : null}
        </>
      ) : (
        <>
          <TextField
            label="کد تأیید پیامکی"
            value={code}
            numeric
            maxDigits={CODE_LENGTH}
            autoComplete="one-time-code"
            hint={`کد به ${ltr(maskPhone(phone))} فرستاده شد`}
            error={error}
            onChange={setCode}
          />
          <Button block loading={busy} disabled={!isValidOtp(code, CODE_LENGTH)} onClick={() => void submit()}>
            ثبت درخواست تغییر شبا
          </Button>
          <button
            type="button"
            className={s.link}
            onClick={() => {
              setPhase('form');
              setCode('');
              setError(undefined);
            }}
          >
            ویرایش شماره‌ی شبا
          </button>
        </>
      )}
    </div>
  );
}
