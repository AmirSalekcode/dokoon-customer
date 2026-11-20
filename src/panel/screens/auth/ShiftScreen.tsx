import { useState } from 'react';
import { Button } from '@/components/base/Button';
import { Icon } from '@/components/primitives/Icon';
import { beginShift } from '../../state/shift';
import { AuthHero } from './AuthHero';
import s from './auth.module.css';

const D_TIP = 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2';
const TIPS = [
  { title: 'این صفحه را باز نگه دارید', sub: 'سفارش‌ها فقط وقتی صفحه باز و آنلاین است با صدا می‌رسند.' },
  {
    title: 'صدا را تأیید کنید',
    sub: 'مرورگر بدون یک لمس اول اجازه‌ی پخش صدا نمی‌دهد؛ دکمه‌ی پایین همین کار را می‌کند.',
  },
  { title: 'صفحه را خاموش نگذارید', sub: 'در تنظیمات گوشی، خاموش‌شدن خودکار صفحه را غیرفعال کنید.' },
];

/**
 * «شروع شیفت» (restaurant screen specs §1, KAN-61): one tap unlocks sound (test chime), keeps the
 * screen on and opens the orders tab. Shown after login and after every reload of the panel.
 */
export function ShiftScreen() {
  const [busy, setBusy] = useState(false);
  return (
    <div className={s.wrap}>
      <AuthHero tag="شروع شیفت" art="dk-cafe" text="برای دریافت سفارش‌ها با صدا، شیفت را شروع کنید." />
      <div className={s.body}>
        <ul className={s.tips} aria-label="نکته‌های شیفت">
          {TIPS.map((t) => (
            <li key={t.title}>
              <Icon d={D_TIP} size={22} />
              <span>
                <strong>{t.title}</strong>
                {t.sub}
              </span>
            </li>
          ))}
        </ul>
        <Button
          size="lg"
          block
          loading={busy}
          onClick={() => {
            setBusy(true);
            // Called synchronously inside the tap: the AudioContext must be created in the gesture.
            void beginShift().finally(() => setBusy(false));
          }}
        >
          شروع شیفت و فعال‌سازی صدا
        </Button>
      </div>
    </div>
  );
}
