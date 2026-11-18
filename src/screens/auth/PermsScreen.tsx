import { useState } from 'react';
import { finishAuth } from '@/auth/flow';
import { Button } from '@/components/base/Button';
import { Icon } from '@/components/primitives/Icon';
import { pushProvider } from '@/providers/push';
import type { ScreenProps } from '../registry';
import s from './auth.module.css';

const BELL = 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0';

/** Ask once for location + notifications. Refusing never blocks; both can be changed later. */
function askLocation(): Promise<void> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve();
    navigator.geolocation.getCurrentPosition(
      () => resolve(),
      () => resolve(),
      { timeout: 10000 },
    );
  });
}

export function PermsScreen(_: ScreenProps) {
  const [busy, setBusy] = useState(false);

  const allow = async () => {
    setBusy(true);
    try {
      await askLocation();
      if (await pushProvider.isSupported()) await pushProvider.requestPermission();
    } catch {
      /* a refused permission is fine */
    } finally {
      setBusy(false);
      finishAuth();
    }
  };

  return (
    <div className={s.au}>
      <div className={s.shield} aria-hidden="true">
        <Icon name="pin" size={44} />
      </div>
      <h1>دسترسی‌ها</h1>
      <p>
        برای نمایش رستوران‌های نزدیک و اطلاع از وضعیت سفارش، این دسترسی‌ها را بدهید. هر زمان بخواهید از
        تنظیمات تغییرشان می‌دهید.
      </p>
      <ul className={s.perms}>
        <li>
          <span className={s.permIcon}>
            <Icon name="pin" />
          </span>
          <span>
            <b>موقعیت مکانی</b>
            <small>پیدا کردن رستوران‌ها و آدرس شما</small>
          </span>
        </li>
        <li>
          <span className={s.permIcon}>
            <Icon d={BELL} />
          </span>
          <span>
            <b>اعلان‌ها</b>
            <small>وضعیت سفارش و پیشنهادهای ویژه</small>
          </span>
        </li>
      </ul>
      <div className={s.foot}>
        <Button size="lg" block loading={busy} onClick={() => void allow()}>
          اجازه می‌دهم
        </Button>
        <Button variant="ghost" block disabled={busy} onClick={finishAuth}>
          فعلاً نه
        </Button>
      </div>
    </div>
  );
}
