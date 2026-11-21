import { useState } from 'react';
import { Button } from '@/components/base/Button';
import { TextField } from '@/components/base/TextField';
import { TopBar } from '@/components/library/TopBar';
import { normalizeDigits } from '@/lib/format';
import { toast } from '@/ui/toast';
import { panelApi } from '../../api/client';
import { businessError } from '../../api/errors';
import {
  isValidOtp,
  isValidPhone,
  isValidSheba,
  normalizePhone,
  normalizeSheba,
  phoneError,
  shebaError,
} from '../../auth/validation';
import { showFullPageError } from '../../errors/fullPage';
import { usePanelNav } from '../../nav/nav';
import { PANEL_TOAST_MS } from '../../shell/openSwitch';
import { useRestaurant } from '../../state/restaurant';
import s from './account.module.css';

const NETWORK = 'ارتباط برقرار نشد؛ اتصال را بررسی کنید';

/**
 * «درخواست تغییر شبا» (KAN-70): new Sheba (mod-97 checked) + a fresh SMS code to the manager's mobile,
 * then `POST /r/me/sheba-change` → Dokoon reviews it; settlements keep the old Sheba until approved.
 * The manager types the mobile because the panel never keeps the full number (contract-notes 28).
 */
export function ShebaScreen() {
  const [sheba, setSheba] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeLength, setCodeLength] = useState(4);
  const [phase, setPhase] = useState<'form' | 'code'>('form');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const nav = usePanelNav.getState;

  const okForm = isValidSheba(sheba) && isValidPhone(normalizePhone(phone));

  const sendCode = async () => {
    if (!okForm || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const { data, error: e } = await panelApi().POST('/r/auth/otp/request', {
        body: { phone: normalizePhone(phone) },
      });
      if (e !== undefined) setError(businessError(e)?.message);
      else {
        setCodeLength(data?.codeLength ?? 4);
        setPhase('code');
      }
    } catch (e) {
      if (!showFullPageError(e, () => void sendCode())) setError(NETWORK);
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!isValidOtp(code, codeLength) || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const { error: e } = await panelApi().POST('/r/me/sheba-change', {
        body: { sheba: normalizeSheba(sheba), otpCode: normalizeDigits(code) },
      });
      if (e !== undefined) {
        setError(businessError(e)?.message);
        return;
      }
      const p = useRestaurant.getState().profile;
      if (p) useRestaurant.setState({ profile: { ...p, pendingShebaChange: true } });
      toast('درخواست تغییر شبا ثبت شد؛ بعد از بررسی دکون اعمال می‌شود', 'success', PANEL_TOAST_MS);
      nav().back();
    } catch (e) {
      if (!showFullPageError(e, () => void submit())) setError(NETWORK);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={s.wrap}>
      <TopBar title="درخواست تغییر شبا" onBack={() => nav().back()} />
      <div className={s.body}>
        <p className={s.note}>
          شبای تازه باید به نام مدیر یا رستوران باشد. بعد از تأیید تیم دکون، تسویه‌های بعدی به آن واریز
          می‌شود.
        </p>
        {phase === 'form' ? (
          <>
            <TextField
              label="شماره‌ی شبای تازه"
              value={sheba}
              ltr
              placeholder="IR و ۲۴ رقم"
              maxLength={34}
              error={shebaError(sheba)}
              onChange={setSheba}
            />
            <TextField
              label="شماره‌ی موبایل مدیر"
              value={phone}
              numeric
              maxDigits={11}
              autoComplete="tel"
              hint="کد تأیید به همین شماره فرستاده می‌شود"
              error={phoneError(phone)}
              onChange={setPhone}
            />
            {error ? (
              <p className={s.err} role="alert">
                {error}
              </p>
            ) : null}
            <Button block loading={busy} disabled={!okForm} onClick={() => void sendCode()}>
              ارسال کد تأیید
            </Button>
          </>
        ) : (
          <>
            <TextField
              label="کد تأیید پیامکی"
              value={code}
              numeric
              maxDigits={codeLength}
              autoComplete="one-time-code"
              error={error}
              onChange={setCode}
            />
            <Button
              block
              loading={busy}
              disabled={!isValidOtp(code, codeLength)}
              onClick={() => void submit()}
            >
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
              ویرایش شبا یا شماره
            </button>
          </>
        )}
      </div>
    </div>
  );
}
