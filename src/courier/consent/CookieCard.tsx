import { useState } from 'react';
import { ToggleRow } from '@/components/library/ToggleRow';
import { useCourierConsent } from './consent';
import s from './CookieCard.module.css';

/**
 * First-visit cookie card on the login page (prototype `.ckb`): «قبول همه» / «فقط ضروری» / «تنظیمات»
 * (essential fixed on, performance and analytics off by default). It is non-blocking and sticks to the
 * bottom of the page while keeping its own space, so it never hides the form for good.
 */
export function CookieCard() {
  const decided = useCourierConsent((st) => st.decided);
  const decide = useCourierConsent((st) => st.decide);
  const [details, setDetails] = useState(false);
  const [performance, setPerformance] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  if (decided) return null;

  return (
    <section className={s.card} role="region" aria-labelledby="ck-title">
      <h2 id="ck-title" className={s.title}>
        کوکی‌ها
      </h2>
      <p className={s.text}>
        برای ورود امن و بهتر شدن برنامه از کوکی استفاده می‌کنیم. موارد اختیاری با اجازه‌ی شماست.
      </p>
      {details ? (
        <div className={s.rows}>
          <ToggleRow title="ضروری" sub="ورود امن و تنظیمات اپ؛ همیشه فعال" on disabled />
          <ToggleRow
            title="عملکرد"
            sub="سرعت و خطاهای برنامه"
            on={performance}
            onFlip={() => setPerformance((v) => !v)}
          />
          <ToggleRow
            title="آمار"
            sub="آمار ناشناس استفاده"
            on={analytics}
            onFlip={() => setAnalytics((v) => !v)}
          />
          <p className={s.note}>موقعیت مکانی کوکی نیست و جداگانه در «مجوزهای دستگاه» مدیریت می‌شود.</p>
          <button type="button" className={s.primary} onClick={() => decide({ performance, analytics })}>
            ذخیره‌ی انتخاب‌ها
          </button>
        </div>
      ) : (
        <div className={s.actions}>
          <button
            type="button"
            className={s.primary}
            onClick={() => decide({ performance: true, analytics: true })}
          >
            قبول همه
          </button>
          <button
            type="button"
            className={s.secondary}
            onClick={() => decide({ performance: false, analytics: false })}
          >
            فقط ضروری
          </button>
          <button type="button" className={s.ghost} onClick={() => setDetails(true)}>
            تنظیمات
          </button>
        </div>
      )}
    </section>
  );
}
