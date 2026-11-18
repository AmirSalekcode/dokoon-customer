import { useState } from 'react';
import { useNav } from '@/nav/nav';
import { ToggleRow } from '@/components/library/ToggleRow';
import { useConsent } from './consent';
import s from './CookieConsent.module.css';

/**
 * Cookie consent popup (bottom card, non-blocking so the app stays usable).
 * Shown until the user decides; can be re-opened from settings via useConsent().reset().
 */
export function CookieConsent() {
  const { decided, acceptAll, essentialOnly, save } = useConsent();
  const push = useNav((st) => st.push);
  const [details, setDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  if (decided) return null;

  return (
    <div className={s.wrap} role="dialog" aria-modal="false" aria-label="رضایت استفاده از کوکی">
      <div className={s.card}>
        <h2 id="cc-title" className={s.title}>
          کوکی‌ها و حریم خصوصی
        </h2>
        <p className={s.text}>
          دکون برای کارکرد اپ (ورود، سبد خرید، تم) اطلاعات ضروری را روی دستگاه شما نگه می‌دارد. با اجازه‌ی شما
          از آمار ناشناس هم برای بهتر کردن اپ استفاده می‌کنیم.{' '}
          <button type="button" className={s.link} onClick={() => push('legal', { doc: 'privacy' })}>
            سیاست حریم خصوصی
          </button>
        </p>

        {details ? (
          <div className={s.rows}>
            <ToggleRow title="کوکی‌های ضروری" sub="بدون این‌ها اپ کار نمی‌کند؛ همیشه فعال" on disabled />
            <ToggleRow
              title="آمار و بهبود اپ"
              sub="آمار ناشناس استفاده؛ پیش‌فرض خاموش"
              on={analytics}
              onFlip={() => setAnalytics((v) => !v)}
            />
            <button type="button" className={s.primary} onClick={() => save({ analytics })}>
              ذخیره‌ی انتخاب‌ها
            </button>
          </div>
        ) : (
          <div className={s.actions}>
            <button type="button" className={s.primary} onClick={acceptAll}>
              پذیرفتن همه
            </button>
            <button type="button" className={s.secondary} onClick={essentialOnly}>
              فقط ضروری
            </button>
            <button type="button" className={s.ghost} onClick={() => setDetails(true)}>
              تنظیمات
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
