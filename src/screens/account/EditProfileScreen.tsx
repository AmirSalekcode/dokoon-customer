import { useState } from 'react';
import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { Button } from '@/components/base/Button';
import { TextField } from '@/components/base/TextField';
import { TopBar } from '@/components/library/TopBar';
import { formatPhone } from '@/lib/format';
import { useNav } from '@/nav/nav';
import { toast } from '@/ui/toast';
import type { ScreenProps } from '../registry';
import s from './account.module.css';

/**
 * Edit profile (screen-specs §6 editprof). The mobile number is read-only: changing it would need a
 * new OTP flow that the contract does not offer yet.
 */
export function EditProfileScreen(_: ScreenProps) {
  const back = useNav((st) => st.back);
  const user = useSession((st) => st.user);
  const [name, setName] = useState(user?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const trimmed = name.trim().replace(/\s+/g, ' ');
  const ok = trimmed.length >= 2 && trimmed !== (user?.name ?? '') && !busy;

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const { data, error: err } = await api.PATCH('/me', { body: { name: trimmed } });
      if (err !== undefined) {
        setError((err as { message?: string }).message || 'ذخیره انجام نشد.');
        return;
      }
      const cur = useSession.getState().user;
      useSession.getState().setUser({ ...cur, ...data, name: data?.name ?? trimmed });
      toast('پروفایل ذخیره شد', 'success');
      back();
    } catch {
      setError('اتصال برقرار نشد. دوباره تلاش کنید.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={s.pageDock}>
      <TopBar title="ویرایش پروفایل" onBack={() => back()} />
      <div className={s.body}>
        <TextField
          label="نام و نام خانوادگی"
          value={name}
          onChange={setName}
          autoComplete="name"
          maxLength={60}
        />
        <TextField
          label="شماره موبایل"
          value={user?.phone ? formatPhone(user.phone) : ''}
          onChange={() => {}}
          readOnly
          hint="برای تغییر شماره با پشتیبانی تماس بگیرید."
        />
        {error ? (
          <p className={s.note} role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <div className={s.dock}>
        <Button size="lg" block disabled={!ok} onClick={() => void save()}>
          ذخیره
        </Button>
      </div>
    </div>
  );
}
